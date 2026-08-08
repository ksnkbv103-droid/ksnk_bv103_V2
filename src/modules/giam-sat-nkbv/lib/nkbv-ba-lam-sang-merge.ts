import type { BaGridSymptomByDate } from "./nkbv-ba-grid-engine";

/** Merge LS từ BA + draft phiên (cùng key → ưu tiên BA có id). */
export function mergeLamSangByDate(
  ba: BaGridSymptomByDate,
  draft: BaGridSymptomByDate,
): BaGridSymptomByDate {
  const dates = new Set([...Object.keys(ba), ...Object.keys(draft)]);
  const out: BaGridSymptomByDate = {};
  for (const d of dates) {
    const map = new Map<string, { key: string; label: string; id?: string }>();
    for (const it of draft[d] || []) map.set(it.key, it);
    for (const it of ba[d] || []) map.set(it.key, it);
    out[d] = [...map.values()];
  }
  return out;
}
