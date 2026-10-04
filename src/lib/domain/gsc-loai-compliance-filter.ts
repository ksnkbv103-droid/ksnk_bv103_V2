/**
 * GSC-01 — phiên vào % tuân thủ / so sánh khoa / BK yếu nhất / top lỗi.
 * Nhật ký vận hành và đánh giá hệ thống ngoài %.
 */

export function isLoaiInGscCompliancePercent(loai: string | null | undefined): boolean {
  const lg = String(loai ?? "")
    .trim()
    .toUpperCase();
  return !lg || lg === "TUAN_THU";
}

export function filterSessionsForGscCompliancePercent<T extends { loai_giam_sat?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((r) => isLoaiInGscCompliancePercent(r.loai_giam_sat));
}

/** Fixture GSC-01 DoD: TUAN_THU 8Đ/2KĐ + NHAT_KY 4KĐ → 80%, mẫu 10. */
export function computeComplianceFromSessionCounts(
  sessions: Array<{ loai_giam_sat?: string | null; tong_dat: number; tong_quan_sat: number }>,
): { ty_le: number | null; tong_quan_sat: number; tong_dat: number } {
  const filtered = filterSessionsForGscCompliancePercent(sessions);
  const tong_quan_sat = filtered.reduce((s, r) => s + r.tong_quan_sat, 0);
  const tong_dat = filtered.reduce((s, r) => s + r.tong_dat, 0);
  if (tong_quan_sat <= 0) return { ty_le: null, tong_quan_sat: 0, tong_dat: 0 };
  return {
    ty_le: Math.round((tong_dat / tong_quan_sat) * 10000) / 100,
    tong_quan_sat,
    tong_dat,
  };
}
