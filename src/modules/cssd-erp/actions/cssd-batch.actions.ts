"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { fetchBatchesAndMachines } from "../helpers/me-tiet-khuan-list-data";
import { assertThietBiSanSangChoMeTietKhuan } from "../helpers/assert-thiet-bi-cho-me-tiet-khuan";
import { getSterilizerMethod, isSteamSterilizerProfile } from "../helpers/me-tiet-khuan-machine-kind";
import {
  assertSteamDailyBdForLoad,
  buildSteamDailyBdSpecsPatch,
} from "@/lib/domain/cssd-steam-daily-bd";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { getBatchAddRejectionReason } from "../helpers/me-tiet-khuan-batch-trace";
import {
  rejectIfMachineHasOpenBatch,
  rejectParentBoWithSub,
  rejectStartMember,
} from "../lib/me-tiet-khuan-batch-integrity";
import {
  persistMeBiResultWithClient,
  persistMeTietKhuanFinishWithClient,
  type PersistMeTietKhuanInput,
} from "../helpers/persist-me-tiet-khuan";
import { evaluateMeQcRelease, steamBiWeeklyReminder } from "../lib/me-tiet-khuan-qc";
import { getErrorMessage, mapFkError, revalidateCssdBatchSurfaces, revalidateCssdWorkflowSurfaces } from "./cssd-action-common";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import { loadBomLinesWithLoaiSpec } from "../shared/application/cssd-quy-trinh-bom";
import { normalizeSpaulding, normalizeSteamMethod } from "../shared/domain/cssd-quy-trinh-bom";
import {
  createSterilizationBatchSchema,
  addQuyTrinhToBatchSchema,
  finishSterilizationBatchSchema,
} from "@/lib/validations/cssd-erp.validations";
import { verifyCssdBatchEdit, verifyCssdBatchQc, verifyCssdBatchView } from "@/lib/cssd-server-gates";
import { resolveCssdTramId } from "../lib/cssd-tram-persist";
import type { BomItem } from "@/lib/domain/cssd-packaging-rules";
import { assertSteamKitHeatAllowed, evaluateBatchSterilizationHeatRisk } from "../lib/me-tiet-khuan-batch-heat";

async function requireSessionActorId(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  try {
    const uc = await createServerSupabaseUserClient();
    const { data, error } = await uc.auth.getUser();
    const userId = data.user?.id ? String(data.user.id) : "";
    if (error || !userId) return { ok: false, message: "Không xác định được người thực hiện." };
    return { ok: true, userId };
  } catch {
    return { ok: false, message: "Không xác định được người thực hiện." };
  }
}

export async function fetchCssdMeListData() {
  try {
    await verifyCssdBatchView();
    const supabase = createAdminSupabaseClient();
    const { batches, machines, batchError, machineError } = await fetchBatchesAndMachines(supabase);
    return { success: true as const, batches, machines, batchError, machineError };
  } catch (e: unknown) {
    return {
      success: false as const,
      error: getErrorMessage(e),
      batches: [] as unknown[],
      machines: [] as unknown[],
    };
  }
}

/** Bộ đang ĐÓNG GÓI, chưa gán mẻ — chờ đưa vào phiếu tiệt khuẩn (tương tự “danh sách chờ” trạm). */
export async function fetchCssdTietKhuanWaitingRows(limit = 120) {
  try {
    await verifyCssdBatchView();
    const supabase = createAdminSupabaseClient();
    const cap = Math.min(Math.max(Number(limit) || 120, 1), 500);
    const dongGoiId = await resolveCssdTramId(supabase, "DONG_GOI");
    if (!dongGoiId) return { success: true as const, data: [] };
    const { data, error } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id, ma_qr_quy_trinh, updated_at, bo_dung_cu_id")
      .eq("tram_hien_tai_id", dongGoiId)
      .is("lo_tiet_khuan_id", null)
      .eq("is_active", true)
      .order("updated_at", { ascending: true })
      .limit(cap);
    if (error) return { success: false as const, error: mapFkError(error.message), data: [] as unknown[] };
    const raw = (data || []) as Array<{
      id: string;
      ma_qr_quy_trinh?: string | null;
      bo_dung_cu_id?: string | null;
      updated_at?: string | null;
    }>;
    const boIds = [...new Set(raw.map((x) => String(x.bo_dung_cu_id || "").trim()).filter(Boolean))];
    let boMap = new Map<string, { ten_bo?: string | null }>();
    if (boIds.length) {
      const { data: bos } = await supabase.from("cssd_dm_bo_dung_cu").select("id, ten_bo").in("id", boIds);
      boMap = new Map((bos || []).map((x: { id: string; ten_bo?: string | null }) => [String(x.id), x]));
    }
    const mapped = raw.map((x) => ({
      id: x.id,
      ma_vach_qr: x.ma_qr_quy_trinh || "",
      updated_at: x.updated_at || "",
      bo_dung_cu_id: x.bo_dung_cu_id ? String(x.bo_dung_cu_id) : null,
      bo: x.bo_dung_cu_id ? { ten_bo: boMap.get(String(x.bo_dung_cu_id))?.ten_bo || null } : null,
    }));
    return { success: true as const, data: mapped };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] as unknown[] };
  }
}

export async function fetchCssdBatchWorkflowState(batchId: string) {
  try {
    await verifyCssdBatchView();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };
    const { data, error } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select(
        "id, ma_lo_tiet_khuan, thiet_bi_id, loai_may_id, tk_chot_nap_at, tk_mo_form_qc_at, tk_qc_json, ket_qua_test, trang_thai_me, trang_thai_bi, phuong_phap, chuong_trinh, co_implant, nhiet_do, ap_suat, thoi_gian_chu_ky, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi, loai_may_id, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may))",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { success: false as const, error: mapFkError(error.message) };
    if (!data) return { success: false as const, error: "Không tìm thấy mẻ." };
    const gate = data as { thiet_bi_id?: string | null; phuong_phap?: string | null; thiet_bi?: unknown };
    const method = getSterilizerMethod({ phuong_phap: gate.phuong_phap }) || getSterilizerMethod(gate.thiet_bi);
    let steamBiReminder: string | null = null;
    if (method === "HOI_NUOC" && gate.thiet_bi_id) {
      const { data: lastBi } = await supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("thoi_gian_ket_thuc, updated_at")
        .eq("thiet_bi_id", gate.thiet_bi_id)
        .in("trang_thai_bi", ["AM", "DUONG"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const lastAt = (lastBi as { thoi_gian_ket_thuc?: string | null; updated_at?: string | null } | null)?.thoi_gian_ket_thuc
        || (lastBi as { updated_at?: string | null } | null)?.updated_at
        || null;
      steamBiReminder = steamBiWeeklyReminder({ method, lastBiAt: lastAt });
    }
    const { data: members } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("bo_dung_cu_id")
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true);
    const boIds = [...new Set((members || []).map((m) => String((m as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "")).filter(Boolean))];
    let coImplant = Boolean((data as { co_implant?: boolean | null }).co_implant);
    if (boIds.length) {
      const { data: bos } = await supabase.from("cssd_dm_bo_dung_cu").select("is_implant").in("id", boIds);
      coImplant = (bos || []).some((b) => (b as { is_implant?: boolean | null }).is_implant === true);
    }
    return { success: true as const, data: { ...data, steamBiReminder, co_implant: coImplant } };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Chốt nạp: khóa thêm bộ, chuyển toàn bộ bộ trong mẻ sang trạng thái TIET_KHUAN. */
export async function confirmBatDauTietKhuanBatch(batchId: string) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };
    const { data: me, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id, tk_chot_nap_at, ket_qua_test, thiet_bi_id, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi, specs, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may))")
      .eq("id", id)
      .maybeSingle();
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    if (!me) return { success: false as const, error: "Không tìm thấy mẻ." };
    if ((me as { tk_chot_nap_at?: string | null }).tk_chot_nap_at) {
      return { success: false as const, error: "Mẻ đã bắt đầu tiệt khuẩn trước đó." };
    }
    const tbRaw = (me as { thiet_bi?: unknown }).thiet_bi;
    const tb = (tbRaw && Array.isArray(tbRaw) ? tbRaw[0] : tbRaw) as {
      ten_thiet_bi?: string;
      specs?: Record<string, unknown> | null;
      loai_may?: { ma_loai_may?: string; ten_loai_may?: string } | { ma_loai_may?: string; ten_loai_may?: string }[] | null;
    } | null;
    const steam = isSteamSterilizerProfile(tb);
    const bdGate = assertSteamDailyBdForLoad({
      isSteam: steam,
      specs: tb?.specs || null,
      requireRecorded: true,
      todayYmd: todayYmdInVn(),
    });
    if (!bdGate.ok) return { success: false as const, error: bdGate.message };
    if ((me as { ket_qua_test?: boolean | null }).ket_qua_test != null) {
      return { success: false as const, error: "Mẻ đã kết thúc đánh giá — không thể bắt đầu lại." };
    }
    const machineId = String((me as { thiet_bi_id?: string | null }).thiet_bi_id || "").trim();
    if (!machineId) return { success: false as const, error: "Mẻ chưa gắn máy — không bắt đầu tiệt khuẩn." };
    const mayOk = await assertThietBiSanSangChoMeTietKhuan(supabase, machineId);
    if (!mayOk.ok) return { success: false as const, error: mayOk.message };

    const { data: members, error: memErr } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("id, ma_qr_quy_trinh, ma_trang_thai_hien_tai, is_active, is_dong_bang, ma_vai_tro_bo")
      .eq("lo_tiet_khuan_id", id);
    if (memErr) return { success: false as const, error: mapFkError(memErr.message) };
    const rows = (members || []) as Array<{
      id: string;
      ma_qr_quy_trinh?: string | null;
      ma_trang_thai_hien_tai?: string | null;
      is_active?: boolean | null;
      is_dong_bang?: boolean | null;
      ma_vai_tro_bo?: string | null;
    }>;
    if (!rows.length) return { success: false as const, error: "Chưa có bộ nào trong mẻ — không thể bắt đầu tiệt khuẩn." };

    const memberIds = rows.map((row) => String(row.id || "")).filter(Boolean);
    const { data: subs, error: subErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("quy_trinh_cha_id")
      .in("quy_trinh_cha_id", memberIds)
      .eq("is_active", true)
      .eq("ma_vai_tro_bo", "SUB");
    if (subErr) return { success: false as const, error: "Không kiểm tra được bộ mẹ/SUB — đã chặn bắt đầu mẻ." };
    const parentIds = new Set((subs || []).map((s) => String((s as { quy_trinh_cha_id?: string }).quy_trinh_cha_id || "")));

    for (const row of rows) {
      const code = String(row.ma_qr_quy_trinh || "").trim() || String(row.id);
      const startReject = rejectStartMember({
        maQr: code,
        tram: row.ma_trang_thai_hien_tai,
        isActive: row.is_active === true,
        isDongBang: row.is_dong_bang === true,
      });
      if (startReject) return { success: false as const, error: startReject };
      const parentMsg = rejectParentBoWithSub({
        maVaiTroBo: row.ma_vai_tro_bo,
        hasActiveSub: parentIds.has(String(row.id)),
      });
      if (parentMsg) return { success: false as const, error: `${parentMsg} Bộ ${code}.` };
      const loaded = await loadBomLinesWithLoaiSpec(supabase, String(row.id));
      const heat = assertSteamKitHeatAllowed({
        isSteam: steam,
        lines: loaded.ok ? loaded.bomLines.map((line) => ({ is_chiu_nhiet: line.is_chiu_nhiet })) : null,
        loadError: !loaded.ok,
      });
      if (!heat.ok) return { success: false as const, error: `${heat.message} Bộ ${code}.` };
    }

    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    const { error: rpcErr } = await supabase.rpc("rpc_cssd_me_bat_dau", {
      p_me_id: id,
      p_actor_user_id: actor.userId,
    });
    if (rpcErr) return { success: false as const, error: mapFkError(rpcErr.message) };
    revalidateCssdBatchSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Kết thúc chu trình vật lý — mở form nhập thông số / đánh giá QC. */
export async function confirmKetThucChuTrinhTietKhuan(batchId: string) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };
    const { data: me, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id, tk_chot_nap_at, tk_mo_form_qc_at, ket_qua_test")
      .eq("id", id)
      .maybeSingle();
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    if (!me) return { success: false as const, error: "Không tìm thấy mẻ." };
    const m = me as { tk_chot_nap_at?: string | null; tk_mo_form_qc_at?: string | null; ket_qua_test?: boolean | null };
    if (!m.tk_chot_nap_at) return { success: false as const, error: "Cần xác nhận bắt đầu tiệt khuẩn trước." };
    if (m.tk_mo_form_qc_at) return { success: false as const, error: "Đã mở form QC — không lặp bước này." };
    if (m.ket_qua_test != null) return { success: false as const, error: "Mẻ đã có kết quả QC." };
    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    const now = new Date().toISOString();
    const { error: upLo } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .update({
        tk_mo_form_qc_at: now,
        trang_thai_me: "CHO_DANH_GIA_QC",
        nguoi_ket_thuc_id: actor.userId,
        updated_at: now,
      })
      .eq("id", id);
    if (upLo) return { success: false as const, error: mapFkError(upLo.message) };
    revalidateCssdBatchSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function fetchCssdBatchMembers(batchId: string) {
  try {
    await verifyCssdBatchView();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ.", data: [] as unknown[] };
    const { data: rows, error } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });
    if (error) return { success: false as const, error: mapFkError(error.message), data: [] as unknown[] };
    const raw = (rows || []) as Array<{ bo_dung_cu_id?: string | null } & Record<string, unknown>>;
    const boIds = [...new Set(raw.map((x) => String(x.bo_dung_cu_id || "").trim()).filter(Boolean))];
    let boMap = new Map<string, { ten_bo?: string | null }>();
    if (boIds.length) {
      const { data: bos } = await supabase.from("cssd_dm_bo_dung_cu").select("id, ten_bo").in("id", boIds);
      boMap = new Map((bos || []).map((x: { id: string; ten_bo?: string | null }) => [String(x.id), x]));
    }
    const data = raw.map((x) => ({
      ...x,
      ma_vach_qr: x.ma_qr_quy_trinh || "",
      trang_thai_hien_tai: x.ma_trang_thai_hien_tai || "",
      bo: x.bo_dung_cu_id ? { ten_bo: boMap.get(String(x.bo_dung_cu_id))?.ten_bo || null } : null,
    }));
    return { success: true as const, data };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] as unknown[] };
  }
}

/** P2: Đánh giá Spaulding/nhiệt gộp cho các bộ trong mẻ + profile máy. */
export async function fetchCssdBatchHeatRisk(batchId: string) {
  try {
    await verifyCssdBatchView();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };

    const { data: me, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select(
        "id, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi, loai_may_id, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may))",
      )
      .eq("id", id)
      .maybeSingle();
    if (meErr) return { success: false as const, error: meErr.message };

    const { data: rows, error: qErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true);
    if (qErr) return { success: false as const, error: qErr.message };

    const qtIds = (rows || []).map((r: { id: string }) => String(r.id));
    const bomItems: BomItem[] = [];

    for (const qtId of qtIds) {
      const loaded = await loadBomLinesWithLoaiSpec(supabase, qtId);
      if (!loaded.ok) return { success: false as const, error: loaded.message };

      for (const row of loaded.bomLines) {
        bomItems.push({
          loai_id: row.loai_id,
          ten: row.ten_dung_cu_le,
          so_luong_ke_hoach: row.so_luong_ke_hoach,
          so_luong_thuc_te: row.so_luong_thuc_te,
          is_chiu_nhiet: row.is_chiu_nhiet,
          phan_loai_spaulding: normalizeSpaulding(row.phan_loai_spaulding),
          phuong_phap_tiet_khuan_chi_dinh: normalizeSteamMethod(row.phuong_phap_tiet_khuan_chi_dinh),
        });
      }
    }

    const tb = (me as { thiet_bi?: { ten_thiet_bi?: string; loai_may?: { ten_loai_may?: string; ma_loai_may?: string } } } | null)
      ?.thiet_bi;
    const machine = tb || null;

    const risk = evaluateBatchSterilizationHeatRisk(bomItems, machine);
    return { success: true as const, risk, setCount: qtIds.length, lineCount: bomItems.length };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}


/** QT.21 — ghi BD đầu ngày lên `cssd_dm_thiet_bi.specs` (ngày lịch VN). */
export async function recordSteamDailyBdAction(input: {
  thietBiId: string;
  ketQua: "DAT" | "KHONG_DAT";
  ymd?: string;
}) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const id = String(input.thietBiId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu máy." };
    const ketQua = input.ketQua === "KHONG_DAT" ? "KHONG_DAT" : "DAT";
    const ymd = String(input.ymd || todayYmdInVn()).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return { success: false as const, error: "Ngày BD không hợp lệ." };
    }
    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    const { data: tb, error: tbErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("id, specs, loai_may:cssd_dm_loai_may(ma_loai_may)")
      .eq("id", id)
      .maybeSingle();
    if (tbErr) return { success: false as const, error: mapFkError(tbErr.message) };
    if (!tb) return { success: false as const, error: "Không tìm thấy máy." };
    if (!isSteamSterilizerProfile(tb)) {
      return { success: false as const, error: "Bowie–Dick đầu ngày chỉ áp dụng cho máy hơi nước." };
    }
    const existing = ((tb as { specs?: Record<string, unknown> | null }).specs || null) as Record<
      string,
      unknown
    > | null;
    const specs = buildSteamDailyBdSpecsPatch({
      ymd,
      ketQua,
      existing,
      actorUserId: actor.userId,
      atIso: new Date().toISOString(),
    });
    const { error: upErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .update({ specs, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (upErr) return { success: false as const, error: mapFkError(upErr.message) };
    revalidateCssdBatchSurfaces();
    return { success: true as const, ymd, ketQua };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function createCssdSterilizationBatch(machineId: string, nguoiLoad: string) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const validated = createSterilizationBatchSchema.parse({ machineId, nguoiLoad });
    const mid = validated.machineId;
    const nguoi = validated.nguoiLoad;
    const mayOk = await assertThietBiSanSangChoMeTietKhuan(supabase, mid);
    if (!mayOk.ok) return { success: false as const, error: mayOk.message };
    const { data: tbRow } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("ten_thiet_bi, specs, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may)")
      .eq("id", mid)
      .maybeSingle();
    const tb = tbRow as {
      ten_thiet_bi?: string;
      specs?: Record<string, unknown> | null;
      loai_may?: { ma_loai_may?: string; ten_loai_may?: string } | { ma_loai_may?: string; ten_loai_may?: string }[] | null;
    } | null;
    const method = getSterilizerMethod(tb);
    if (!method) {
      return { success: false as const, error: "Chỉ máy tiệt khuẩn (hơi nước, plasma, EO) mới tạo được mẻ." };
    }
    const bdGate = assertSteamDailyBdForLoad({
        isSteam: method === "HOI_NUOC",
        specs: tb?.specs || null,
        requireRecorded: true,
        todayYmd: todayYmdInVn(),
      });
    if (!bdGate.ok) return { success: false as const, error: bdGate.message };
    const { data: openRow, error: openErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("ma_lo_tiet_khuan")
      .eq("thiet_bi_id", mid)
      .eq("is_active", true)
      .is("ket_qua_test", null)
      .or("trang_thai_me.is.null,trang_thai_me.neq.CHO_BI")
      .limit(1)
      .maybeSingle();
    if (openErr) return { success: false as const, error: mapFkError(openErr.message) };
    const openMsg = rejectIfMachineHasOpenBatch(
      (openRow as { ma_lo_tiet_khuan?: string | null } | null)?.ma_lo_tiet_khuan,
    );
    if (openMsg) return { success: false as const, error: openMsg };
    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    const { data: created, error } = await supabase.rpc("rpc_cssd_me_tao", {
      p_thiet_bi_id: mid,
      p_actor_user_id: actor.userId,
      p_ghi_chu: `Người load: ${nguoi}`,
      p_chuong_trinh: null,
    });
    if (error) {
      if (/uq_cssd_fact_lo_mo_mot_may|chưa kết luận/i.test(error.message)) {
        return {
          success: false as const,
          error: "Máy đang có mẻ chưa kết luận. Kết thúc mẻ đó trước khi tạo mẻ mới.",
        };
      }
      return { success: false as const, error: mapFkError(error.message) };
    }
    const createdId = String((created as { id?: string } | null)?.id || "").trim();
    const { data: me, error: meErr } = createdId
      ? await supabase.from("cssd_fact_lo_tiet_khuan").select("*").eq("id", createdId).maybeSingle()
      : { data: created, error: null };
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    revalidateCssdBatchSurfaces();
    return { success: true as const, data: me };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function addQuyTrinhToSterilizationBatch(activeMeId: string, code: string) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const validated = addQuyTrinhToBatchSchema.parse({ activeMeId, code });
    const meId = validated.activeMeId;
    const resolved = await resolveCssdCodeWithClient(supabase, validated.code);
    if (resolved.targetType === "MACHINE") {
      return { success: false as const, error: "Mã vừa quét là mã máy. Vui lòng quét mã bộ dụng cụ để thêm vào mẻ." };
    }
    const qr = resolved.code;

    const { data: me, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id, ma_lo_tiet_khuan, thiet_bi_id, tk_chot_nap_at")
      .eq("id", meId)
      .maybeSingle();
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    if (!me) return { success: false as const, error: "Không tìm thấy mẻ." };
    const batchLocked = Boolean((me as { tk_chot_nap_at?: string | null }).tk_chot_nap_at);
    const machineId = String((me as { thiet_bi_id?: string | null }).thiet_bi_id || "").trim();
    if (machineId) {
      const mayOk = await assertThietBiSanSangChoMeTietKhuan(supabase, machineId);
      if (!mayOk.ok) return { success: false as const, error: mayOk.message };
    }

    const qt = await fetchActiveQuyTrinhByScanCode(supabase, qr);
    if (!qt) return { success: false as const, error: "Mã QR không hợp lệ hoặc không tồn tại." };

    const qtNormalized = {
      ...qt,
      ma_vach_qr: String((qt as { ma_qr_quy_trinh?: string }).ma_qr_quy_trinh || qr),
      trang_thai_hien_tai: (qt as { ma_trang_thai_hien_tai?: string }).ma_trang_thai_hien_tai,
    };
    const reject = getBatchAddRejectionReason(qtNormalized, meId, { batchLocked });
    if (reject) return { success: false as const, error: reject };

    const { count: subCount, error: subErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id", { count: "exact", head: true })
      .eq("quy_trinh_cha_id", String(qt.id))
      .eq("is_active", true)
      .eq("ma_vai_tro_bo", "SUB");
    if (subErr) return { success: false as const, error: "Không kiểm tra được bộ mẹ/SUB — đã chặn nạp." };
    const parentMsg = rejectParentBoWithSub({
      maVaiTroBo: (qt as { ma_vai_tro_bo?: string | null }).ma_vai_tro_bo,
      hasActiveSub: (subCount ?? 0) > 0,
    });
    if (parentMsg) {
      return { success: false as const, error: `${parentMsg} Bộ ${String(qtNormalized.ma_vach_qr || qr)}.` };
    }

    let isSteam = false;
    if (machineId) {
      const { data: tbRow, error: tbErr } = await supabase
        .from("cssd_dm_thiet_bi")
        .select("ten_thiet_bi, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may)")
        .eq("id", machineId)
        .maybeSingle();
      if (tbErr) return { success: false as const, error: "Không kiểm tra được máy — đã chặn nạp." };
      if (!tbRow) return { success: false as const, error: "Không tìm thấy thiết bị." };
      const tb = tbRow as {
        ten_thiet_bi?: string;
        loai_may?: { ma_loai_may?: string; ten_loai_may?: string } | { ma_loai_may?: string; ten_loai_may?: string }[] | null;
      };
      isSteam = isSteamSterilizerProfile(tb);
    }
    const loaded = await loadBomLinesWithLoaiSpec(supabase, String(qt.id));
    const heat = assertSteamKitHeatAllowed({
      isSteam,
      lines: loaded.ok ? loaded.bomLines.map((line) => ({ is_chiu_nhiet: line.is_chiu_nhiet })) : null,
      loadError: !loaded.ok,
    });
    if (!heat.ok) return { success: false as const, error: heat.message };

    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    const { error: rpcErr } = await supabase.rpc("rpc_cssd_me_add_quy_trinh", {
      p_me_id: meId,
      p_quy_trinh_id: String(qt.id),
      p_actor_user_id: actor.userId,
    });
    if (rpcErr) return { success: false as const, error: mapFkError(rpcErr.message) };

    const tenBo = String((qt as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "").trim()
      ? (
          await supabase
            .from("cssd_dm_bo_dung_cu")
            .select("ten_bo")
            .eq("id", String((qt as { bo_dung_cu_id?: string | null }).bo_dung_cu_id))
            .maybeSingle()
        ).data?.ten_bo || ""
      : "";
    revalidateCssdBatchSurfaces();
    return {
      success: true as const,
      tenBo: String(tenBo || "").trim() || qr,
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

async function previewFinishNeedsQc(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  p: PersistMeTietKhuanInput,
): Promise<{ ok: true; needsQc: boolean } | { ok: false; message: string }> {
  const { data: me, error } = await supabase
    .from("cssd_fact_lo_tiet_khuan")
    .select("phuong_phap, thiet_bi:cssd_dm_thiet_bi(loai_may:cssd_dm_loai_may(ma_loai_may))")
    .eq("id", p.activeMeId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  if (!me) return { ok: false, message: "Không tìm thấy mẻ tiệt khuẩn." };
  const row = me as { phuong_phap?: string | null; thiet_bi?: unknown };
  const method = getSterilizerMethod({ phuong_phap: row.phuong_phap }) || getSterilizerMethod(row.thiet_bi);
  const { data: members } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("bo_dung_cu_id")
    .eq("lo_tiet_khuan_id", p.activeMeId)
    .eq("is_active", true);
  const boIds = [...new Set((members || []).map((m) => String((m as { bo_dung_cu_id?: string | null }).bo_dung_cu_id || "")).filter(Boolean))];
  let coImplant = false;
  if (boIds.length) {
    const { data: bos, error: boErr } = await supabase.from("cssd_dm_bo_dung_cu").select("is_implant").in("id", boIds);
    if (boErr) return { ok: false, message: boErr.message };
    coImplant = (bos || []).some((b) => (b as { is_implant?: boolean | null }).is_implant === true);
  }
  const evaluated = evaluateMeQcRelease({
    thongSoVatLy: p.thongSoVatLy,
    ciNgoaiGoi: p.ciNgoaiGoi,
    ciPcd: p.ciPcd,
    trangThaiBi: p.trangThaiBi,
    method,
    coImplant,
    nhietDo: p.nhietDo,
    apSuat: p.apSuat,
    thoiGianChuKy: p.thoiGianChuKy,
  });
  if (!evaluated.ok) return evaluated;
  return { ok: true, needsQc: evaluated.decision.outcome === "HOAN_THANH" && coImplant };
}

export async function finishCssdSterilizationBatch(input: PersistMeTietKhuanInput) {
  try {
    const supabase = createAdminSupabaseClient();
    const validated = finishSterilizationBatchSchema.parse(input) as PersistMeTietKhuanInput;
    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    let operatorEmail: string | null = null;
    try {
      const uc = await createServerSupabaseUserClient();
      const { data } = await uc.auth.getUser();
      operatorEmail = data.user?.email?.trim() || null;
    } catch {
      operatorEmail = null;
    }
    const preview = await previewFinishNeedsQc(supabase, validated);
    if (!preview.ok) {
      await verifyCssdBatchEdit();
      return { success: false as const, error: preview.message };
    }
    if (preview.needsQc) await verifyCssdBatchQc();
    else await verifyCssdBatchEdit();
    const saved = await persistMeTietKhuanFinishWithClient(supabase, {
      ...validated,
      operatorAuthUserId: actor.userId,
      operatorEmail,
    });
    if (!saved.ok) return { success: false as const, error: saved.message };
    revalidateCssdBatchSurfaces();
    revalidateCssdWorkflowSurfaces();
    return {
      success: true as const,
      outcome: saved.outcome,
      incidentIds: saved.incidentIds || [],
      createdCount: saved.createdCount || 0,
      skippedCount: saved.skippedCount || 0,
      recalledCount: saved.recalledCount || 0,
      machineHeld: Boolean(saved.machineHeld),
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Nhập BI cho mẻ CHO_BI. Quyền QC. Âm thì nhả; dương thì sự cố BI. */
export async function nhapKetQuaBiMeTietKhuan(batchId: string, ketQua: "AM" | "DUONG") {
  try {
    await verifyCssdBatchQc();
    const supabase = createAdminSupabaseClient();
    const id = String(batchId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã mẻ." };
    if (ketQua !== "AM" && ketQua !== "DUONG") {
      return { success: false as const, error: "Kết quả BI chỉ nhận âm hoặc dương." };
    }
    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };
    let operatorEmail: string | null = null;
    try {
      const uc = await createServerSupabaseUserClient();
      const { data } = await uc.auth.getUser();
      operatorEmail = data.user?.email?.trim() || null;
    } catch {
      operatorEmail = null;
    }
    const saved = await persistMeBiResultWithClient(supabase, {
      batchId: id,
      ketQua,
      operatorAuthUserId: actor.userId,
      operatorEmail,
      nguoiLabel: operatorEmail || "CSSD",
    });
    if (!saved.ok) return { success: false as const, error: saved.message };
    revalidateCssdBatchSurfaces();
    revalidateCssdWorkflowSurfaces();
    return {
      success: true as const,
      outcome: saved.outcome,
      incidentIds: saved.incidentIds || [],
      createdCount: saved.createdCount || 0,
      skippedCount: saved.skippedCount || 0,
      recalledCount: saved.recalledCount || 0,
      machineHeld: Boolean(saved.machineHeld),
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
