import { addDays } from "./nkbv-shared-timeline";
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

/** Tập ngày IWP lâm sàng Index ± 3 (DOE chưa chốt). */
export function provisionalIwpDateSet(indexDate: string): Set<string> {
  const ix = String(indexDate || "").slice(0, 10);
  const out = new Set<string>();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ix)) return out;
  for (let i = -3; i <= 3; i += 1) {
    out.add(addDays(ix, i));
  }
  return out;
}

/** Lọc LS chỉ các ngày thuộc cửa sổ (IWP / tập ngày cho trước). */
export function pickLamSangInDates(
  source: BaGridSymptomByDate,
  dates: ReadonlySet<string> | string[],
): BaGridSymptomByDate {
  const allow =
    dates instanceof Set
      ? dates
      : new Set(Array.from(dates).map((d) => String(d).slice(0, 10)));
  const out: BaGridSymptomByDate = {};
  for (const [d, items] of Object.entries(source || {})) {
    const day = d.slice(0, 10);
    if (!allow.has(day) || !items?.length) continue;
    out[day] = items.map((it) => ({ ...it }));
  }
  return out;
}

/**
 * Hydrate draft phiên từ LS đã có trên BA ∩ cửa sổ IWP Index mới.
 * CDC tịnh tiến: triệu chứng timeline trong IWP mới vẫn là yếu tố cấu thành sự kiện mới.
 */
export function hydrateLamSangDraftFromBa(input: {
  ba: BaGridSymptomByDate;
  draft: BaGridSymptomByDate;
  indexDate: string;
  /** Nếu có (sau khi có DOE) — ưu tiên cửa sổ IWP thật; không thì Index±3. */
  iwpDates?: ReadonlySet<string> | null;
}): { next: BaGridSymptomByDate; changed: boolean } {
  const window =
    input.iwpDates && input.iwpDates.size > 0
      ? input.iwpDates
      : provisionalIwpDateSet(input.indexDate);
  const fromBa = pickLamSangInDates(input.ba, window);
  const next = mergeLamSangByDate(fromBa, input.draft || {});
  let changed = false;
  const draftKeys = new Set(
    Object.entries(input.draft || {}).flatMap(([d, items]) =>
      (items || []).map((it) => `${d.slice(0, 10)}|${it.key}`),
    ),
  );
  for (const [d, items] of Object.entries(fromBa)) {
    for (const it of items) {
      if (!draftKeys.has(`${d}|${it.key}`)) {
        changed = true;
        break;
      }
    }
    if (changed) break;
  }
  return { next, changed };
}
