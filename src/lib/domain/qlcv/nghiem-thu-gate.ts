/**
 * Cổng nghiệm thu — chỉ đóng HOAN_THANH khi phiếu ở cổng chờ nghiệm thu.
 * Việc định kỳ không vào cổng này (tick đủ là đóng).
 * Quá hạn: hạn / cờ view — mã `QUA_HAN` chỉ là alias đang làm (nhãn), không phải cổng riêng.
 */

import { isQlcvLoaiDinhKy } from "./dinh-ky-auto-complete";
import { normalizeQlcvTrangThaiToCanonical } from "./trang-thai-canonical";

export type QlcvNghiemThuGateInput = {
  trang_thai?: string | null;
  phan_tram_hoan_thanh?: number | null;
  loai_cong_viec?: string | null;
  han_hoan_thanh?: string | null;
  is_qua_han?: boolean | null;
};

function isHanHoanThanhDaQua(han: string | null | undefined): boolean {
  if (!han) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(String(han));
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/** Phiếu mở đang làm — kể cả quá hạn theo hạn/cờ; `QUA_HAN` = alias đang làm. */
function isPhieuMoDangLam(st: string, input: QlcvNghiemThuGateInput): boolean {
  if (st === "DANG_LAM" || st === "QUA_HAN") return true;
  return input.is_qua_han === true || isHanHoanThanhDaQua(input.han_hoan_thanh);
}

export function isEligibleForNghiemThu(input: QlcvNghiemThuGateInput): boolean {
  if (isQlcvLoaiDinhKy(input.loai_cong_viec)) return false;
  const st = normalizeQlcvTrangThaiToCanonical(input.trang_thai);
  if (st === "HOAN_THANH" || st === "DA_HUY") return false;
  const pct = Number(input.phan_tram_hoan_thanh ?? 0);
  if (st === "CHO_DUYET") return true;
  if (pct < 100) return false;
  return isPhieuMoDangLam(st, input);
}
