/** Mã CDC Location (NHSN) gắn khoa viện — W4 lát 1, chưa chạy thuật toán 80% acuity. */

const CODE_RE = /^[A-Z0-9][A-Z0-9:_-]{1,39}$/;

export function normalizeCdcLocationCode(raw: unknown): string | null {
  const s = String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!s) return null;
  if (!CODE_RE.test(s)) return null;
  return s;
}

export function summarizeCdcLocationCoverage(
  rows: Array<{ is_active?: boolean | null; cdc_location_code?: string | null }>,
): { totalActive: number; mapped: number } {
  let totalActive = 0;
  let mapped = 0;
  for (const r of rows) {
    if (r.is_active === false) continue;
    totalActive += 1;
    if (normalizeCdcLocationCode(r.cdc_location_code)) mapped += 1;
  }
  return { totalActive, mapped };
}
