/** Trạng thái ca đã chốt — KPI/dịch tễ chỉ đếm XAC_NHAN; không cho form lâm sàng ghi đè. */
export const NKBV_TERMINAL_CASE_STATUS_MAS = ["XAC_NHAN", "LOAI_TRU", "DA_DONG"] as const;

export type NkbvTerminalCaseStatus = (typeof NKBV_TERMINAL_CASE_STATUS_MAS)[number];

export function isNkbvTerminalCaseStatus(ma: string | null | undefined): boolean {
  const m = String(ma ?? "").trim().toUpperCase();
  return (NKBV_TERMINAL_CASE_STATUS_MAS as readonly string[]).includes(m);
}

export const NKBV_CLINICAL_SUBMIT_LOCKED_VI =
  "Ca đã chốt (xác nhận / loại trừ / đã đóng) — không gửi lại form lâm sàng. Dùng panel thẩm định hoặc ẩn phiếu nếu cần.";
