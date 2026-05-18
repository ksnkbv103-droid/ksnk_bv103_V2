"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { coMeTietKhuanChuaKetThucTheoThietBi } from "../helpers/assert-thiet-bi-cho-me-tiet-khuan";
import { getErrorMessage, mapFkError, safeRevalidate } from "./cssd-action-common";
import { normalizeCssdCode } from "../shared/domain/cssd-qr-core";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { verifyCssdMaintenanceEdit } from "./cssd-permissions";
import { cssdMaintenanceStartInputSchema } from "../shared/contracts/cssd-context.contracts";

function nextMaPhieu(): string {
  return `BT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function addDaysIso(dateYmd: string, days: number): string {
  const d = new Date(`${dateYmd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bắt đầu bảo trì: phiếu DANG_THUC_HIEN + đặt dm_thiet_bi = REPAIRING. */
export async function batDauBaoTriThietBiAction(input: { thiet_bi_id?: string; ma_thiet_bi_hoac_qr?: string; ly_do: string }) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceEdit();
    const parsed = cssdMaintenanceStartInputSchema.parse(input);
    const tidRaw = String(parsed.thiet_bi_id || "").trim();
    const deviceCode = normalizeCssdCode(parsed.ma_thiet_bi_hoac_qr);
    const lyDo = String(parsed.ly_do || "").trim();
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

    const { data: tb, error: tbErr } = await supabase.from("dm_thiet_bi").select("trang_thai").eq("id", tid).maybeSingle();
    if (tbErr) return { success: false as const, error: mapFkError(tbErr.message) };
    const st = String((tb as { trang_thai?: string })?.trang_thai || "").trim();
    if (!["READY", "HOAT_DONG"].includes(st)) {
      return { success: false as const, error: `Thiết bị không ở trạng thái sẵn sàng (${st || "—"}).` };
    }

    const ma_phieu = nextMaPhieu();
    const now = new Date().toISOString();

    const { data: ins, error: insErr } = await supabase
      .from("fact_bao_tri_thiet_bi")
      .insert({
        ma_phieu,
        thiet_bi_id: tid,
        trang_thai: "DANG_THUC_HIEN",
        ly_do: lyDo,
        thoi_gian_bat_dau: now,
        updated_at: now,
      })
      .select("id, ma_phieu")
      .single();
    if (insErr) return { success: false as const, error: mapFkError(insErr.message) };

    const { error: upErr } = await supabase.from("dm_thiet_bi").update({ trang_thai: "REPAIRING", updated_at: now }).eq("id", tid);
    if (upErr) {
      const insId = String((ins as { id?: string })?.id || "");
      if (insId) await supabase.from("fact_bao_tri_thiet_bi").delete().eq("id", insId);
      return { success: false as const, error: mapFkError(upErr.message) };
    }

    safeRevalidate("/cssd-erp/equipment-maintenance");
    safeRevalidate("/cssd-erp/batch");
    return { success: true as const, data: ins };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Hoàn thành bảo trì: phiếu HOAN_THANH + dm_thiet_bi READY + cập nhật ngày bảo trì kế. */
export async function ketThucBaoTriThietBiAction(input: { id: string; ket_qua_ghi_nhan: string }) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceEdit();
    const id = String(input.id || "").trim();
    const ketQua = String(input.ket_qua_ghi_nhan || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu." };
    if (!ketQua) return { success: false as const, error: "Nhập kết quả / biên bản bàn giao." };

    const { data: ph, error: pErr } = await supabase
      .from("fact_bao_tri_thiet_bi")
      .select("id, trang_thai, thiet_bi_id")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr) return { success: false as const, error: mapFkError(pErr.message) };
    if (!ph) return { success: false as const, error: "Không tìm thấy phiếu." };
    if (String((ph as { trang_thai?: string }).trang_thai) !== "DANG_THUC_HIEN") {
      return { success: false as const, error: "Phiếu không đang ở trạng thái thực hiện." };
    }

    const thietBiId = String((ph as { thiet_bi_id?: string }).thiet_bi_id || "");
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const { data: tb, error: tbErr } = await supabase
      .from("dm_thiet_bi")
      .select("chu_ky_bao_tri_ngay")
      .eq("id", thietBiId)
      .maybeSingle();
    if (tbErr) return { success: false as const, error: mapFkError(tbErr.message) };

    const cycle = Math.max(1, Number((tb as { chu_ky_bao_tri_ngay?: number })?.chu_ky_bao_tri_ngay) || 180);
    const ngayTiepTheo = addDaysIso(today, cycle);

    const { error: uPhieu } = await supabase
      .from("fact_bao_tri_thiet_bi")
      .update({
        trang_thai: "HOAN_THANH",
        ket_qua_ghi_nhan: ketQua,
        thoi_gian_ket_thuc: now,
        updated_at: now,
      })
      .eq("id", id);
    if (uPhieu) return { success: false as const, error: mapFkError(uPhieu.message) };

    const { error: uTb } = await supabase
      .from("dm_thiet_bi")
      .update({
        trang_thai: "READY",
        ngay_bao_tri_gan_nhat: today,
        ngay_bao_tri_tiep_theo: ngayTiepTheo,
        updated_at: now,
      })
      .eq("id", thietBiId);
    if (uTb) return { success: false as const, error: mapFkError(uTb.message) };

    safeRevalidate("/cssd-erp/equipment-maintenance");
    safeRevalidate("/cssd-erp/batch");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Hủy phiếu đang mở: trả máy về READY (không cập nhật lịch bảo trì). */
export async function huyBaoTriThietBiAction(input: { id: string }) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceEdit();
    const id = String(input.id || "").trim();
    if (!id) return { success: false as const, error: "Thiếu phiếu." };

    const { data: ph, error: pErr } = await supabase
      .from("fact_bao_tri_thiet_bi")
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

    const { error: uPhieu } = await supabase
      .from("fact_bao_tri_thiet_bi")
      .update({
        trang_thai: "HUY",
        thoi_gian_ket_thuc: now,
        updated_at: now,
      })
      .eq("id", id);
    if (uPhieu) return { success: false as const, error: mapFkError(uPhieu.message) };

    const { error: uTb } = await supabase.from("dm_thiet_bi").update({ trang_thai: "READY", updated_at: now }).eq("id", thietBiId);
    if (uTb) return { success: false as const, error: mapFkError(uTb.message) };

    safeRevalidate("/cssd-erp/equipment-maintenance");
    safeRevalidate("/cssd-erp/batch");
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
