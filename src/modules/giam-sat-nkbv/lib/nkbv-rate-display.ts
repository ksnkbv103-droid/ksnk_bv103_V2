/**
 * SSOT hiển thị tỷ suất NKBV (/1000 device-days, DUR, SSI %).
 * Pool = sum(cases)/sum(days) — không trung bình các rate theo khoa.
 */

export function roundRate2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Ca / device-days × 1000 — null khi mẫu số ≤ 0. */
export function ratePer1000(cases: number, deviceDays: number): number | null {
  const c = Number(cases);
  const d = Number(deviceDays);
  if (!Number.isFinite(c) || !Number.isFinite(d) || d <= 0) return null;
  return roundRate2((c / d) * 1000);
}

export function formatRatePer1000(cases: number, deviceDays: number): string {
  const r = ratePer1000(cases, deviceDays);
  return r == null ? "—" : r.toFixed(2);
}

/** DUR = device-days / patient-days — luôn kiểm mẫu số patient-days. */
export function formatDurRatio(
  deviceDays: number,
  patientDays: number,
  digits = 4,
): string {
  const d = Number(deviceDays);
  const p = Number(patientDays);
  if (!Number.isFinite(d) || !Number.isFinite(p) || p <= 0) return "—";
  return (d / p).toFixed(digits);
}

/** SSI raw % = ca SSI / số ca mổ × 100. */
export function formatSsiPercent(ssiCases: number, surgeries: number): string {
  const c = Number(ssiCases);
  const s = Number(surgeries);
  if (!Number.isFinite(c) || !Number.isFinite(s) || s <= 0) return "—";
  return roundRate2((c / s) * 100).toFixed(2);
}

export function formatNullableFixed(
  value: number | null | undefined,
  digits = 2,
): string {
  return value == null || !Number.isFinite(Number(value))
    ? "—"
    : Number(value).toFixed(digits);
}

/**
 * Ratio 0..1 → phần trăm hiển thị.
 * KHÔNG dùng cho DUR trên dashboard — DUR SSOT là `formatDurRatio` (0.2500, không phải 25%).
 */
export function formatNullablePercentRatio(
  value: number | null | undefined,
  digits = 2,
): string {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${(Number(value) * 100).toFixed(digits)}%`;
}
