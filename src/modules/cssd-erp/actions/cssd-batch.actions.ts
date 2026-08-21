"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { fetchBatchesAndMachines } from "../helpers/me-tiet-khuan-list-data";
import { assertThietBiSanSangChoMeTietKhuan } from "../helpers/assert-thiet-bi-cho-me-tiet-khuan";
import { getBatchAddRejectionReason, logQuyTrinhVaoMeTietKhuan } from "../helpers/me-tiet-khuan-batch-trace";
import { persistMeTietKhuanFinishWithClient, type PersistMeTietKhuanInput } from "../helpers/persist-me-tiet-khuan";
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
import { verifyCssdBatchEdit, verifyCssdBatchView } from "@/lib/cssd-server-gates";
import { buildQuyTrinhTramPatch, resolveCssdTramId } from "../lib/cssd-tram-persist";
import type { BomItem } from "@/lib/domain/cssd-packaging-rules";
import { evaluateBatchSterilizationHeatRisk } from "../lib/me-tiet-khuan-batch-heat";

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
        "id, ma_lo_tiet_khuan, thiet_bi_id, loai_may_id, tk_chot_nap_at, tk_mo_form_qc_at, tk_qc_json, ket_qua_test, thiet_bi:cssd_dm_thiet_bi(ten_thiet_bi, loai_may_id, loai_may:cssd_dm_loai_may(ma_loai_may, ten_loai_may))",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { success: false as const, error: mapFkError(error.message) };
    if (!data) return { success: false as const, error: "Không tìm thấy mẻ." };
    return { success: true as const, data };
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
      .select("id, tk_chot_nap_at, ket_qua_test")
      .eq("id", id)
      .maybeSingle();
    if (meErr) return { success: false as const, error: mapFkError(meErr.message) };
    if (!me) return { success: false as const, error: "Không tìm thấy mẻ." };
    if ((me as { tk_chot_nap_at?: string | null }).tk_chot_nap_at) {
      return { success: false as const, error: "Mẻ đã bắt đầu tiệt khuẩn trước đó." };
    }
    if ((me as { ket_qua_test?: boolean | null }).ket_qua_test != null) {
      return { success: false as const, error: "Mẻ đã kết thúc đánh giá — không thể bắt đầu lại." };
    }
    const { data: members, error: memErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("lo_tiet_khuan_id", id)
      .eq("is_active", true);
    if (memErr) return { success: false as const, error: mapFkError(memErr.message) };
    const ids = (members || []).map((m: { id: string }) => m.id).filter(Boolean);
    if (!ids.length) return { success: false as const, error: "Chưa có bộ nào trong mẻ — không thể bắt đầu tiệt khuẩn." };
    const now = new Date().toISOString();
    const { error: upLo } = await supabase.from("cssd_fact_lo_tiet_khuan").update({ tk_chot_nap_at: now, thoi_gian_bat_dau: now, updated_at: now }).eq("id", id);
    if (upLo) return { success: false as const, error: mapFkError(upLo.message) };
    const tkPatch = await buildQuyTrinhTramPatch(supabase, "TIET_KHUAN");
    const { error: upQt } = await supabase
      .from("cssd_fact_quy_trinh")
      .update({ ...tkPatch, updated_at: now })
      .in("id", ids);
    if (upQt) return { success: false as const, error: mapFkError(upQt.message) };
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
    const now = new Date().toISOString();
    const { error: upLo } = await supabase.from("cssd_fact_lo_tiet_khuan").update({ tk_mo_form_qc_at: now, updated_at: now }).eq("id", id);
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

    const tb = (me as { thiet_bi?: { ten_thiet_bi?: string; loai_may?: { ten_loai_may?: string; ma_loai_may?: string } | { ten_loai_may?: string; ma_loai_may?: string }[] } } | null)
      ?.thiet_bi;
    const lmRaw = tb?.loai_may;
    const lm = Array.isArray(lmRaw) ? lmRaw[0] : lmRaw;
    const machine = {
      ma_loai_may: lm?.ma_loai_may || null,
      loai_thiet_bi: lm?.ma_loai_may || tb?.ten_thiet_bi || null,
      loai_ten_hien_thi: lm?.ten_loai_may || null,
      loai_may: lm || null,
    };

    const risk = evaluateBatchSterilizationHeatRisk(bomItems, machine);
    return { success: true as const, risk, setCount: qtIds.length, lineCount: bomItems.length };
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
    const ma = `LOT-${Date.now().toString().slice(-6)}`;
    const { data: me, error } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .insert({
        ma_lo_tiet_khuan: ma,
        thiet_bi_id: mid,
        ghi_chu: `Người load: ${nguoi}`,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { success: false as const, error: mapFkError(error.message) };
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

    const { error: upErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .update({
        lo_tiet_khuan_id: meId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", qt.id);
    if (upErr) return { success: false as const, error: mapFkError(upErr.message) };

    const logMsg = await logQuyTrinhVaoMeTietKhuan(supabase, {
      quyTrinhId: String(qt.id),
      maVachQr: String(qtNormalized.ma_vach_qr || qr),
      maLo: String(me.ma_lo_tiet_khuan || ""),
      nguoiThucHien: "CSSD",
    });
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
      logWarning: logMsg,
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function finishCssdSterilizationBatch(input: PersistMeTietKhuanInput) {
  try {
    await verifyCssdBatchEdit();
    const supabase = createAdminSupabaseClient();
    const validated = finishSterilizationBatchSchema.parse(input);
    let operatorAuthUserId: string | null = null;
    let operatorEmail: string | null = null;
    try {
      const uc = await createServerSupabaseUserClient();
      const { data } = await uc.auth.getUser();
      operatorAuthUserId = data.user?.id ?? null;
      operatorEmail = data.user?.email?.trim() || null;
    } catch {
      /* demo: vẫn ghi thời gian nếu không có phiên */
    }
    const saved = await persistMeTietKhuanFinishWithClient(supabase, {
      ...(validated as PersistMeTietKhuanInput),
      operatorAuthUserId,
      operatorEmail,
    });
    if (!saved.ok) return { success: false as const, error: saved.message };
    revalidateCssdBatchSurfaces();
    revalidateCssdWorkflowSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
