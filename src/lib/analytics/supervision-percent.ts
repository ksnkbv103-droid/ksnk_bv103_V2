/** Làm tròn và hiển thị % tuân thủ — VST 1 chữ số, GSC 2 chữ số. */

export function roundPercent1(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

export function formatPercent1(value: unknown, { suffix = true }: { suffix?: boolean } = {}): string {
  // GSC-07 / VST-06: mẫu 0 → null → «—» (không = 0.0% giả).
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const text = roundPercent1(n).toFixed(1);
  return suffix ? `${text}%` : text;
}

export function formatPercent1FromRatio(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return formatPercent1((numerator / denominator) * 100);
}

export function roundPercent2(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatPercent2(value: unknown, { suffix = true }: { suffix?: boolean } = {}): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const rounded = roundPercent2(n);
  const text = rounded.toFixed(2);
  return suffix ? `${text}%` : text;
}

export function formatPercent2FromRatio(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return formatPercent2((numerator / denominator) * 100);
}

export type SupervisionPercentDigits = 1 | 2;

/** VST 1 chữ số; GSC và phần còn lại 2 chữ số. */
export function supervisionPercentDigits(moduleLabel?: string | null): SupervisionPercentDigits {
  return String(moduleLabel ?? "").trim().toUpperCase() === "VST" ? 1 : 2;
}

export function formatSupervisionPercent(value: unknown, digits: SupervisionPercentDigits): string {
  return digits === 1 ? formatPercent1(value) : formatPercent2(value);
}

export function roundSupervisionPercent(value: unknown, digits: SupervisionPercentDigits): number {
  return digits === 1 ? roundPercent1(value) : roundPercent2(value);
}

/** |tự GS − chuyên trách| sau khi mỗi tỷ lệ đã làm tròn đúng số chữ số của module. */
export function formatGapDeltaPercent(
  tyLeKsnk: number | null | undefined,
  tyLeTgs: number | null | undefined,
  digits: SupervisionPercentDigits,
): string | null {
  if (tyLeKsnk == null || tyLeTgs == null) return null;
  if (!Number.isFinite(tyLeKsnk) || !Number.isFinite(tyLeTgs)) return null;
  const delta = Math.abs(roundSupervisionPercent(tyLeKsnk - tyLeTgs, digits));
  return `Δ ${formatSupervisionPercent(delta, digits)}`;
}
