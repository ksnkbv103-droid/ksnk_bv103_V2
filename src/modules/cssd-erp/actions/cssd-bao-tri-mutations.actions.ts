"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { coMeTietKhuanChuaKetThucTheoThietBi } from "../helpers/assert-thiet-bi-cho-me-tiet-khuan";
import { getErrorMessage, mapFkError, revalidateCssdMaintenanceSurfaces } from "./cssd-action-common";
import { normalizeCssdCode } from "../shared/domain/cssd-qr-core";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { verifyCssdMaintenanceEdit } from "@/lib/cssd-server-gates";
import { cssdMaintenanceStartInputSchema } from "../shared/contracts/cssd-context.contracts";
import { buildPmChecklistForLoaiMay, allChecklistDone, parseChecklistJson } from "@/lib/domain/cssd-equipment-pm-checklist";
import type { CssdPmChecklistItem } from "@/lib/domain/cssd-equipment-pm-checklist";

function nextMaPhieu(): string {
  return `BT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function addDaysIso(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bắt đầu bảo trì: phiếu DANG_THUC_HIEN + đặt cssd_dm_thiet_bi = REPAIRING. */
export async function batDauBaoTriThietBiAction(input: {
  thiet_bi_id?: string;
  ma_thiet_bi_hoac_qr?: string;
  ly_do: string;
  loai_phieu?: "DINH_KY" | "SUA_CHUA";
  su_co_id?: string;
}) {
  try {
    await verifyCssdMaintenanceEdit();
    const supabase = createAdminSupabaseClient();
    const parsed = cssdMaintenanceStartInputSchema.parse(input);
    const tidRaw = String(parsed.thiet_bi_id || "").trim();
    const deviceCode = normalizeCssdCode(parsed.ma_thiet_bi_hoac_qr);
    const lyDo = String(parsed.ly_do || "").trim();
    const loaiPhieu = parsed.loai_phieu === "SUA_CHUA" ? "SUA_CHUA" : "DINH_KY";
    const suCoId = String(parsed.su_co_id || "").trim() || null;
    if (!tidRaw && !deviceCode) return { success: false as const, error: "Chọn thiết bị hoặc quét mã thiết bị." };
    if (!lyDo) return { success: false as const, error: "Nhập lý do / nội dung bảo trì." };

    let tid = tidRaw;
    if (!tid && deviceCode) {
      const resolved = await resolveCssdCodeWithClient(supabase, deviceCode);
      if (resolved.targetType === "INSTRUMENT_SET") {
        return { success: false as const, error: "Mã vừa quét là mã bộ dụng cụ, không phải mã máy." };
      }
      tid = String(resolved.machineId || "").trim();
      if (!tid) return { success: false as const, error: "Không tìm thấy thiết bị theo mã/QR đã quét." };
    }

    const me = await coMeTietKhuanChuaKetThucTheoThietBi(supabase, tid);
    if (me.open) {
      return {
        success: false as const,
        error: `Còn mẻ tiệt khuẩn chưa kết thúc QC trên máy này (lô ${me.ma_lo || "?"}). Hoàn tất hoặc xử lý mẻ trước khi bảo trì.`,
      };
    }

    const { data: tb, error: tbErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("trang_thai, loai_may_id, loai_may:cssd_dm_loai_may(ma_loai_may)")
      .eq("id", tid)
      .maybeSingle();
    if (tbErr) return { success: false as const, error: mapFkError(tbErr.message) };
    const st = String((tb as { trang_thai?: string })?.trang_thai || "").trim();
    /** ME-03: cho mở bảo trì từ tạm giữ (HOLD_QC). */
    if (!["READY", "HOAT_DONG", "HOLD_QC"].includes(st)) {
      return { success: false as const, error: `Thiết bị không mở được bảo trì (${st || "—"}).` };
    }

    const lm = (tb as { loai_may?: { ma_loai_may?: string } | { ma_loai_may?: string }[] | null }).loai_may;
    const lmRow = Array.isArray(lm) ? lm[0] : lm;
    const maLoai = String(lmRow?.ma_loai_may || "").trim();
    const checklist = loaiPhieu === "DINH_KY" ? buildPmChecklistForLoaiMay(maLoai) : [];

    const ma_phieu = nextMaPhieu();
    const now = new Date().toISOString();

    const { data: ins, error: insErr } = await supabase
      .from("cssd_fact_bao_tri")
      .insert({
        ma_phieu,
        thiet_bi_id: tid,
        trang_thai: "DANG_THUC_HIEN",
        loai_phieu: loaiPhieu,
        ly_do: lyDo,
        checklist_jsonb: checklist,
        su_co_id: suCoId,
        thoi_gian_bat_dau: now,
        updated_at: now,
      })
      .select("id, ma_phieu")
      .single();
    if (insErr) return { success: false as const, error: mapFkError(insErr.message) };

    const { data: tbFull } = await supabase.from("cssd_dm_thiet_bi").select("specs").eq("id", tid).maybeSingle();
    const prevSpecs = (tbFull?.specs && typeof tbFull.specs === "object" ? tbFull.specs : {}) as Record<
      string,
      unknown
    >;
    const { error: upErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .update({
        trang_thai: "REPAIRING",
        specs: { ...prevSpecs, bao_tri_prev_trang_thai: st },
        updated_at: now,
      })
      .eq("id", tid);
    if (upErr) {
      const insId = String((ins as { id?: string })?.id || "");
      if (insId) await supabase.from("cssd_fact_bao_tri").delete().eq("id", insId);
      return { success: false as const, error: mapFkError(upErr.message) };
    }

    revalidateCssdMaintenanceSurfaces();
    return { success: true as const, data: ins };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Hoàn thành bảo trì: phiếu HOAN_THANH; máy HOLD trước đó → CHO_THAM_DINH (ME-03), còn lại READY. */
export async function ketThucBaoTriThietBiAction(input: {
  id: string;
  ket_qua_ghi_nhan: string;
  checklist_jsonb?: CssdPmChecklistItem[];
}) {
  try {
    await verifyCssdMaintenanceEdit();
    const supabase = createAdminSupabaseClient();
    const id = String(input.id || "").trim();
    const ketQua = String(input.ket_qua_ghi_nhan || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu." };
    if (!ketQua) return { success: false as const, error: "Nhập kết quả / biên bản bàn giao." };

    const { data: ph, error: pErr } = await supabase
      .from("cssd_fact_bao_tri")
      .select("id, trang_thai, thiet_bi_id, loai_phieu, checklist_jsonb")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr) return { success: false as const, error: mapFkError(pErr.message) };
    if (!ph) return { success: false as const, error: "Không tìm thấy phiếu." };
    if (String((ph as { trang_thai?: string }).trang_thai) !== "DANG_THUC_HIEN") {
      return { success: false as const, error: "Phiếu không đang ở trạng thái thực hiện." };
    }

    const loaiPhieu = String((ph as { loai_phieu?: string }).loai_phieu || "DINH_KY");
    const checklist =
      input.checklist_jsonb && input.checklist_jsonb.length
        ? input.checklist_jsonb
        : parseChecklistJson((ph as { checklist_jsonb?: unknown }).checklist_jsonb);
    if (loaiPhieu === "DINH_KY" && checklist.length && !allChecklistDone(checklist)) {
      return { success: false as const, error: "Hoàn thành tất cả mục checklist bảo dưỡng định kỳ." };
    }

    const thietBiId = String((ph as { thiet_bi_id?: string }).thiet_bi_id || "");
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data: tb, error: tbErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("chu_ky_bao_tri_ngay, specs")
      .eq("id", thietBiId)
      .maybeSingle();
    if (tbErr) return { success: false as const, error: mapFkError(tbErr.message) };

    const cycle = Math.max(1, Number((tb as { chu_ky_bao_tri_ngay?: number })?.chu_ky_bao_tri_ngay) || 180);
    const ngayTiepTheo = addDaysIso(today, cycle);
    const specs = ((tb as { specs?: Record<string, unknown> | null })?.specs || {}) as Record<string, unknown>;
    const prevTt = String(specs.bao_tri_prev_trang_thai || "").trim().toUpperCase();
    const fromHold = prevTt === "HOLD_QC";
    const nextTt = fromHold ? "CHO_THAM_DINH" : "READY";
    const nextSpecs: Record<string, unknown> = {
      ...specs,
      bd_hold_bao_tri_xong_at: fromHold ? now : specs.bd_hold_bao_tri_xong_at,
    };
    delete nextSpecs.bao_tri_prev_trang_thai;

    const { error: uPhieu } = await supabase
      .from("cssd_fact_bao_tri")
      .update({
        trang_thai: "HOAN_THANH",
        ket_qua_ghi_nhan: ketQua,
        checklist_jsonb: checklist,
        thoi_gian_ket_thuc: now,
        updated_at: now,
      })
      .eq("id", id);
    if (uPhieu) return { success: false as const, error: mapFkError(uPhieu.message) };

    const { error: uTb } = await supabase
      .from("cssd_dm_thiet_bi")
      .update({
        trang_thai: nextTt,
        ngay_bao_tri_gan_nhat: today,
        ngay_bao_tri_tiep_theo: ngayTiepTheo,
        specs: nextSpecs,
        updated_at: now,
      })
      .eq("id", thietBiId);
    if (uTb) return { success: false as const, error: mapFkError(uTb.message) };

    revalidateCssdMaintenanceSurfaces();
    return { success: true as const, trangThaiMay: nextTt };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Hủy phiếu đang mở: trả máy về trạng thái trước khi mở (ME-03), mặc định READY. */
export async function huyBaoTriThietBiAction(input: { id: string }) {
  try {
    await verifyCssdMaintenanceEdit();
    const supabase = createAdminSupabaseClient();
    const id = String(input.id || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu." };

    const { data: ph, error: pErr } = await supabase
      .from("cssd_fact_bao_tri")
      .select("id, trang_thai, thiet_bi_id")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr) return { success: false as const, error: mapFkError(pErr.message) };
    if (!ph) return { success: false as const, error: "Không tìm thấy phiếu." };
    if (String((ph as { trang_thai?: string }).trang_thai) !== "DANG_THUC_HIEN") {
      return { success: false as const, error: "Chỉ hủy được phiếu đang thực hiện." };
    }

    const thietBiId = String((ph as { thiet_bi_id?: string }).thiet_bi_id || "");
    const now = new Date().toISOString();
    const { data: tb } = await supabase.from("cssd_dm_thiet_bi").select("specs").eq("id", thietBiId).maybeSingle();
    const specs = (tb?.specs && typeof tb.specs === "object" ? tb.specs : {}) as Record<string, unknown>;
    const restore = String(specs.bao_tri_prev_trang_thai || "READY").trim() || "READY";
    const nextSpecs = { ...specs };
    delete nextSpecs.bao_tri_prev_trang_thai;

    const { error: uPhieu } = await supabase
      .from("cssd_fact_bao_tri")
      .update({
        trang_thai: "HUY",
        thoi_gian_ket_thuc: now,
        updated_at: now,
      })
      .eq("id", id);
    if (uPhieu) return { success: false as const, error: mapFkError(uPhieu.message) };

    const { error: uTb } = await supabase
      .from("cssd_dm_thiet_bi")
      .update({ trang_thai: restore, specs: nextSpecs, updated_at: now })
      .eq("id", thietBiId);
    if (uTb) return { success: false as const, error: mapFkError(uTb.message) };

    revalidateCssdMaintenanceSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/**
 * ME-03: xác nhận thẩm định sau bảo trì (quyền qc) — cần đủ 3 kết quả BI âm trong hồ sơ máy.
 * N-ME-3: hình thức ghi chú 3 mẻ cho tới khi mở park M-17 đầy đủ.
 */
export async function xacNhanThamDinhThietBiAction(input: {
  thietBiId: string;
  biKetQua: { ngay: string; maMeThu: string; ketQua: "AM" }[];
  ghiChu?: string;
}) {
  try {
    const { verifyCssdBatchQc } = await import("@/lib/cssd-server-gates");
    await verifyCssdBatchQc();
    const supabase = createAdminSupabaseClient();
    const id = String(input.thietBiId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu máy." };
    const rows = Array.isArray(input.biKetQua) ? input.biKetQua : [];
    if (rows.length < 3 || rows.some((r) => r.ketQua !== "AM" || !String(r.ngay || "").trim() || !String(r.maMeThu || "").trim())) {
      return { success: false as const, error: "Cần đủ 3 kết quả BI âm (ngày + số mẻ thử) trước khi sẵn sàng." };
    }
    const { data: tb, error } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("trang_thai, specs")
      .eq("id", id)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    if (!tb) return { success: false as const, error: "Không tìm thấy máy." };
    if (String(tb.trang_thai || "") !== "CHO_THAM_DINH") {
      return { success: false as const, error: "Máy không ở trạng thái chờ thẩm định." };
    }
    const specs = (tb.specs && typeof tb.specs === "object" ? tb.specs : {}) as Record<string, unknown>;
    const now = new Date().toISOString();
    const { error: upErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .update({
        trang_thai: "READY",
        specs: {
          ...specs,
          tham_dinh_bi: rows.slice(0, 3),
          tham_dinh_at: now,
          tham_dinh_ghi_chu: String(input.ghiChu || "").trim() || null,
        },
        updated_at: now,
      })
      .eq("id", id);
    if (upErr) return { success: false as const, error: upErr.message };
    revalidateCssdMaintenanceSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
