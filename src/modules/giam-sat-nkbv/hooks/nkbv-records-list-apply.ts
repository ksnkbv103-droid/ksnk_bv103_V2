/**
 * Quyết định apply kết quả list HSBA NKBV (tab ẩn → bỏ qua, giữ data cũ).
 * Tách thuần để vitest node không cần render hook.
 */

export type NkbvRecordsListSkipped = { skipped: true };

export type NkbvRecordsListSuccess = {
  success: true;
  data?: unknown[] | null;
  totalCount?: number | null;
};

export type NkbvRecordsListFailure = {
  success: false;
  error?: string | null;
};

export type NkbvRecordsListOutcome =
  | NkbvRecordsListSkipped
  | NkbvRecordsListSuccess
  | NkbvRecordsListFailure;

export type NkbvRecordsListApplyHandlers = {
  setLoading: (loading: boolean) => void;
  setData: (rows: unknown[]) => void;
  setTotalCount: (n: number) => void;
  onErrorMessage: (message: string) => void;
};

/** Apply outcome: skipped → chỉ tắt loading; success → set data; failure → toast. */
export function applyNkbvRecordsListOutcome(
  outcome: NkbvRecordsListOutcome,
  handlers: NkbvRecordsListApplyHandlers,
): void {
  handlers.setLoading(false);
  if ("skipped" in outcome) return;
  if (outcome.success) {
    handlers.setData(outcome.data ?? []);
    handlers.setTotalCount(outcome.totalCount ?? 0);
    return;
  }
  handlers.onErrorMessage(outcome.error || "Không thể tải danh sách bệnh án");
}
