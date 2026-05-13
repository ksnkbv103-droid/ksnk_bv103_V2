/**
 * Helper chung cho import phiên giám sát (VST / GSC / …): gom id từ file, query `.in` theo lô.
 */

/** Id phiên từ dòng import (`ma_phien` hoặc `id`). */
export function collectImportSessionIdsFromRows(rows: ReadonlyArray<Record<string, unknown>>): string[] {
  const s = new Set<string>();
  for (const row of rows || []) {
    const id = String((row as { ma_phien?: unknown }).ma_phien ?? (row as { id?: unknown }).id ?? "")
      .trim();
    if (id) s.add(id);
  }
  return [...s];
}

/** Chia mảng id để tránh URL/query quá dài với `.in("id", …)`. */
export function chunkIdsForSupabaseInFilter(ids: readonly string[], chunkSize = 150): string[][] {
  if (ids.length === 0) return [];
  const size = Math.max(1, Math.min(chunkSize, 300));
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}
