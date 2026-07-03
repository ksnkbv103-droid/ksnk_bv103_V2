/**
 * Cổng nghiệm thu — chỉ đóng HOAN_THANH khi phiếu ở cổng chờ nghiệm thu.
 */

export type QlcvNghiemThuGateInput = {
  trang_thai?: string | null;
  phan_tram_hoan_thanh?: number | null;
};

export function isEligibleForNghiemThu(input: QlcvNghiemThuGateInput): boolean {
  const st = String(input.trang_thai || "").trim().toUpperCase();
  const pct = Number(input.phan_tram_hoan_thanh ?? 0);
  if (st === "CHO_DUYET" || st === "CHO_XAC_NHAN_HOAN_THANH") return true;
  return (st === "DANG_LAM" || st === "DANG_THUC_HIEN") && pct >= 100;
}

export function canForceCloseWithoutNghiemThuGate(_input: QlcvNghiemThuGateInput): boolean {
  return false;
}
