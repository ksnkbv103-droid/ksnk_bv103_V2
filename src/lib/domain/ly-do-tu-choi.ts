/**
 * QT-016 (PO 19/11 P10=A): từ chối đề xuất danh mục dụng cụ và yêu cầu sửa/xóa phiên VST
 * bắt buộc lý do ≥ 3 ký tự (cùng ngưỡng với từ chối yêu cầu tài khoản,
 * `rejectAccountAccessRequestSchema`). Dùng chung cho form (promptText.minLength) và server action.
 */
export const LY_DO_TU_CHOI_TOI_THIEU = 3;

export const LY_DO_TU_CHOI_THIEU_MSG = `Lý do từ chối tối thiểu ${LY_DO_TU_CHOI_TOI_THIEU} ký tự.`;

export function chuanHoaLyDoTuChoi(
  raw: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = String(raw ?? "").trim();
  if (value.length < LY_DO_TU_CHOI_TOI_THIEU) return { ok: false, error: LY_DO_TU_CHOI_THIEU_MSG };
  return { ok: true, value };
}
