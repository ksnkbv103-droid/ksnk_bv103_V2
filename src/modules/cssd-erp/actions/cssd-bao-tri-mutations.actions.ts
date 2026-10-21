"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { coMeTietKhuanChuaKetThucTheoThietBi } from "../helpers/assert-thiet-bi-cho-me-tiet-khuan";
import { getErrorMessage, mapFkError, revalidateCssdMaintenanceSurfaces } from "./cssd-action-common";
import { normalizeCssdCode } from "../shared/domain/cssd-qr-core";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { verifyCssdMaintenanceEdit } from "@/lib/cssd-server-gates";
import { cssdMaintenanceStartInputSchema } from "../shared/contracts/cssd-context.contracts";
import { buildPmChecklistForLoaiMay } from "@/lib/domain/cssd-equipment-pm-checklist";
import type { CssdPmChecklistItem } from "@/lib/domain/cssd-equipment-pm-checklist";

function nextMaPhieu(): string {
  return `BT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

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

/** Lỗi nghiệp vụ RPC (P0001, tiếng Việt) trả nguyên văn; lỗi khác log và báo chung. */
function rpcFail(err: { code?: string; message: string }, action: string, userId: string) {
  if (err.code === "P0001") return { success: false as const, error: err.message };
  console.error({ module: "cssd-bao-tri", action, userId, error: err.message });
  return { success: false as const, error: "Không thực hiện được thao tác bảo trì. Vui lòng thử lại." };
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
      .select("loai_may_id, loai_may:cssd_dm_loai_may(ma_loai_may)")
      .eq("id", tid)
      .maybeSingle();
    if (tbErr) return { success: false as const, error: mapFkError(tbErr.message) };

    const lm = (tb as { loai_may?: { ma_loai_may?: string } | { ma_loai_may?: string }[] | null } | null)?.loai_may;
    const lmRow = Array.isArray(lm) ? lm[0] : lm;
    const maLoai = String(lmRow?.ma_loai_may || "").trim();
    const checklist = loaiPhieu === "DINH_KY" ? buildPmChecklistForLoaiMay(maLoai) : [];

    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };

    // TB-1: phiếu + trạng thái máy trong một giao dịch DB (kiểm trạng thái, mẻ mở, phiếu trùng nằm ở RPC).
    const { data: ins, error: insErr } = await supabase.rpc("rpc_cssd_bao_tri_bat_dau", {
      p_thiet_bi_id: tid,
      p_actor_user_id: actor.userId,
      p_ly_do: lyDo,
      p_loai_phieu: loaiPhieu,
      p_checklist: checklist,
      p_su_co_id: suCoId,
      p_ma_phieu: nextMaPhieu(),
    });
    if (insErr) return rpcFail(insErr, "batDauBaoTriThietBiAction", actor.userId);

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

    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };

    // TB-1: DB kiểm phiếu/checklist, cập nhật phiếu + máy nguyên tử.
    const { data, error } = await supabase.rpc("rpc_cssd_bao_tri_ket_thuc", {
      p_id: id,
      p_actor_user_id: actor.userId,
      p_ket_qua: ketQua,
      p_checklist: input.checklist_jsonb && input.checklist_jsonb.length ? input.checklist_jsonb : null,
    });
    if (error) return rpcFail(error, "ketThucBaoTriThietBiAction", actor.userId);

    revalidateCssdMaintenanceSurfaces();
    const trangThaiMay = String((data as { trang_thai_may?: string } | null)?.trang_thai_may || "");
    return { success: true as const, trangThaiMay };
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

    const actor = await requireSessionActorId();
    if (!actor.ok) return { success: false as const, error: actor.message };

    const { error } = await supabase.rpc("rpc_cssd_bao_tri_huy", { p_id: id, p_actor_user_id: actor.userId });
    if (error) return rpcFail(error, "huyBaoTriThietBiAction", actor.userId);

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
