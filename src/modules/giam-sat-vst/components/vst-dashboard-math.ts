/** Tỉ lệ % (1 chữ số thập phân), các phần cộng đúng 100.0 — dùng phần dư lớn nhất. */
export function sharePercentagesOneDecimal(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((c) => (c * 1000) / total);
  const floors = exact.map((x) => Math.floor(x));
  const rem = 1000 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const tenths = [...floors];
  for (let k = 0; k < rem; k++) tenths[order[k].i] += 1;
  return tenths.map((t) => t / 10);
}

export function formatPctOneDecimal(v: number): string {
  return `${Math.round(v * 10) / 10}%`;
}
