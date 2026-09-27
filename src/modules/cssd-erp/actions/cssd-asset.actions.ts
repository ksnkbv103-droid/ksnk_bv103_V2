"use server";

import { verifyPermission } from "@/lib/server-permission";
import { instrumentChangeRequiresIncidentResult } from "@/lib/domain/cssd-instrument-incident";

/**
 * Đã đóng: điều chuyển cấu phần BOM-only (không ghi sổ) — biến động số lượng chỉ qua
 * cửa Luân chuyển `/cssd-dung-cu` (ledger RPC) hoặc Hỏng/Mất `/cssd-su-co`.
 * Giữ export để tránh import vỡ; không còn caller runtime.
 */
export async function dieuChuyenThanhPhanGiuaHaiQrAction(_payload: {
  maQrTu: string;
  maQrDen: string;
  tenDungCuLe: string;
  soLuong: number;
  ghiChu?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "edit");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
  return instrumentChangeRequiresIncidentResult();
}
