/** Làm tròn và hiển thị % tuân thủ — 2 chữ số thập phân (pilot chuẩn GSC/VST). */

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
