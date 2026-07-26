/**
 * Cổng nghiệm thu — chỉ đóng HOAN_THANH khi phiếu ở cổng chờ nghiệm thu.
 */

import { normalizeQlcvTrangThaiToCanonical } from "./trang-thai-canonical";

export type QlcvNghiemThuGateInput = {
  trang_thai?: string | null;
  phan_tram_hoan_thanh?: number | null;
};

export function isEligibleForNghiemThu(input: QlcvNghiemThuGateInput): boolean {
  const st = normalizeQlcvTrangThaiToCanonical(input.trang_thai);
  const pct = Number(input.phan_tram_hoan_thanh ?? 0);
  if (st === "CHO_DUYET") return true;
  // QUA_HAN + 100%: vẫn nghiệm thu được (cron đã gắn quá hạn trước khi báo xong).
  return (st === "DANG_LAM" || st === "QUA_HAN") && pct >= 100;
}
