/**
 * Cấp phát: danh sách chờ = bộ ở kho sạch chưa giao khoa.
 * Không dùng `ma_ca_mo_id` (ca mổ không có trên UI).
 */

export function isWaitingForWardIssuance(row: {
  khoa_nhan_id?: string | null;
  ma_ca_mo_id?: string | null;
}): boolean {
  void row.ma_ca_mo_id;
  return !String(row.khoa_nhan_id || "").trim();
}

export function assertKhoaNhanRequired(khoaNhanId: unknown): string | null {
  if (!String(khoaNhanId || "").trim()) {
    return "Chọn khoa nhận trước khi xác nhận cấp phát.";
  }
  return null;
}
