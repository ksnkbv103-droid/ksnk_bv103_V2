/**
 * Trạng thái khởi tạo Track B (lean): đã giao phụ trách → DANG_LAM ngay, không cổng "nhận việc".
 */

export function resolveQlcvTrangThaiMaForTask(params: {
  isActive: boolean;
  nguoi_phu_trach_id?: string | null;
  to_cong_tac_id?: string | null;
}): string {
  if (!params.isActive) return "MOI";
  if (params.nguoi_phu_trach_id || params.to_cong_tac_id) return "DANG_LAM";
  return "MOI";
}
