import { format, parseISO, startOfMonth, subMonths } from "date-fns";

/**
 * Số **tháng lịch** (đầu tháng → đến ngày) mặc định cho dashboard / báo cáo tổng hợp.
 * Trước đây 12 tháng — rút xuống để giảm khối lượng RPC; người dùng vẫn mở rộng trong UI.
 * Pilot EXPLAIN (cùng cửa sổ 6 tháng): `scripts/sql/pilot-dashboard-rpc-explain-01-summary.sql`,
 * `scripts/sql/pilot-dashboard-rpc-explain-04-command-center-hotpath.sql`.
 */
export const BV103_ANALYTICS_DEFAULT_MONTHS = 6;

const monthSpanMinusOne = BV103_ANALYTICS_DEFAULT_MONTHS - 1;

/** `denIso` dạng `yyyy-MM-dd` → `tu` đầu tháng cách `BV103_ANALYTICS_DEFAULT_MONTHS` tháng. */
export function bv103DefaultTuNgayFromDenIso(denIso: string): string {
  const den = parseISO(denIso);
  return format(startOfMonth(subMonths(den, monthSpanMinusOne)), "yyyy-MM-dd");
}

/** Hôm nay làm `đến ngày` ngầm định → `tu` đầu tháng theo cùng quy tắc. */
export function bv103DefaultTuNgayFromToday(): string {
  return format(startOfMonth(subMonths(new Date(), monthSpanMinusOne)), "yyyy-MM-dd");
}
