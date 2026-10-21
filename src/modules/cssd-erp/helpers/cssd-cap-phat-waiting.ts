/** CS-FIX: loại bộ đang chờ thu hồi khỏi danh sách chờ cấp phát. */
export function filterOutRecallPending<T extends object>(
  rows: readonly T[],
  recallPendingIds: ReadonlySet<string>,
): T[] {
  return rows.filter((r) => !recallPendingIds.has(String((r as { id?: unknown }).id)));
}
