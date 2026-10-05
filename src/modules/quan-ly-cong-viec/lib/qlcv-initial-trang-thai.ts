/**
 * Trạng thái khởi tạo Track B: đã giao phụ trách → DANG_LAM; tổ không thay phụ trách.
 */

export function resolveQlcvTrangThaiMaForTask(params: {
  isActive: boolean;
  nguoi_phu_trach_id?: string | null;
  to_cong_tac_id?: string | null;
}): string {
  if (!params.isActive) return "MOI";
  // QLCV-04: chỉ phụ trách cá nhân → DANG_LAM (tổ không đủ).
  if (params.nguoi_phu_trach_id) return "DANG_LAM";
  void params.to_cong_tac_id;
  return "MOI";
}
