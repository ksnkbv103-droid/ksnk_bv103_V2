/** Làm tròn và hiển thị % tuân thủ — VST 1 chữ số, GSC 2 chữ số. */

export function roundPercent1(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

export function formatPercent1(value: unknown, { suffix = true }: { suffix?: boolean } = {}): string {
  const text = roundPercent1(value).toFixed(1);
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
  const rounded = roundPercent2(value);
  const text = rounded.toFixed(2);
  return suffix ? `${text}%` : text;
}

export function formatPercent2FromRatio(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return formatPercent2((numerator / denominator) * 100);
}
