/**
 * Cổng nghiệm thu — chỉ đóng HOAN_THANH khi phiếu ở cổng chờ nghiệm thu.
 * Việc định kỳ không vào cổng này (tick đủ là đóng).
 */

import { isQlcvLoaiDinhKy } from "./dinh-ky-auto-complete";
import { normalizeQlcvTrangThaiToCanonical } from "./trang-thai-canonical";

export type QlcvNghiemThuGateInput = {
  trang_thai?: string | null;
  phan_tram_hoan_thanh?: number | null;
  loai_cong_viec?: string | null;
};

export function isEligibleForNghiemThu(input: QlcvNghiemThuGateInput): boolean {
  if (isQlcvLoaiDinhKy(input.loai_cong_viec)) return false;
  const st = normalizeQlcvTrangThaiToCanonical(input.trang_thai);
  const pct = Number(input.phan_tram_hoan_thanh ?? 0);
  if (st === "CHO_DUYET") return true;
  // QUA_HAN + 100% (đột xuất/khẩn): vẫn nghiệm thu được.
  return (st === "DANG_LAM" || st === "QUA_HAN") && pct >= 100;
}
