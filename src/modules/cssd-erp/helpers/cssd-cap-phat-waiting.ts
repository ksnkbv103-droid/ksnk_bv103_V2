import { isSterilePackExpired } from "@/lib/domain/cssd-pack-issuance";

/** CS-FIX: loại bộ đang chờ thu hồi khỏi danh sách chờ cấp phát. */
export function filterOutRecallPending<T extends object>(
  rows: readonly T[],
  recallPendingIds: ReadonlySet<string>,
): T[] {
  return rows.filter((r) => !recallPendingIds.has(String((r as { id?: unknown }).id)));
}

/** Loại bộ đã quá hạn sử dụng vô khuẩn khỏi danh sách chờ cấp phát (thiếu HSD giữ lại để cổng quét báo lỗi rõ). */
export function filterOutExpiredPacks<T extends object>(rows: readonly T[], todayYmd?: string): T[] {
  return rows.filter((r) => {
    const x = r as { han_su_dung?: string | null; ngay_het_han?: string | null };
    return !isSterilePackExpired(x.han_su_dung || x.ngay_het_han, todayYmd);
  });
}
