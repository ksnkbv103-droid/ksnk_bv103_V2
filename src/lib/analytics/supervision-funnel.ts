/**
 * Funnel plot (Spiegelhalter 2005) so sánh tỷ lệ tuân thủ giữa các khoa có cỡ mẫu khác nhau.
 * Xấp xỉ chuẩn quanh tỷ lệ chung p0: p0 ± z·√(p0(1−p0)/n). Khoa n nhỏ có dải rộng nên ít bị xếp «lệch».
 * Chỉ để đọc nhanh; không đổi công thức tỷ lệ. Mẫu mỏng (n<20) vẫn xám theo luật hiện có.
 */

export const FUNNEL_Z_95 = 1.96;
export const FUNNEL_Z_998 = 3.09;

export type FunnelVerdict = "above" | "below" | "within";

export type FunnelLimits = { low: number; high: number };

/** Tỷ lệ chung (0–1) từ tổng đạt/tổng cơ hội; tổng ≤ 0 → null. */
export function funnelOverallRate(rows: ReadonlyArray<{ dat: number; tong: number }>): number | null {
  let dat = 0;
  let tong = 0;
  for (const r of rows) {
    if (!Number.isFinite(r.dat) || !Number.isFinite(r.tong) || r.tong <= 0) continue;
    dat += r.dat;
    tong += r.tong;
  }
  return tong > 0 ? dat / tong : null;
}

/** Giới hạn kiểm soát (đơn vị %) tại cỡ mẫu n. n ≤ 0 hoặc p0 ngoài [0,1] → null. */
export function funnelLimits(p0: number, n: number, z: number = FUNNEL_Z_95): FunnelLimits | null {
  if (!Number.isFinite(p0) || !Number.isFinite(n) || n <= 0 || p0 < 0 || p0 > 1) return null;
  const half = z * Math.sqrt((p0 * (1 - p0)) / n);
  return { low: Math.max(0, p0 - half) * 100, high: Math.min(1, p0 + half) * 100 };
}

/** Xếp khoa so với dải: trên dải = tốt hơn chung, dưới dải = kém hơn chung, còn lại = trong dải. */
export function classifyFunnel(dat: number, tong: number, p0: number, z: number = FUNNEL_Z_95): FunnelVerdict | null {
  const lim = funnelLimits(p0, tong, z);
  if (!lim || !Number.isFinite(dat)) return null;
  const rate = (Math.min(Math.max(dat, 0), tong) / tong) * 100;
  if (rate > lim.high) return "above";
  if (rate < lim.low) return "below";
  return "within";
}
