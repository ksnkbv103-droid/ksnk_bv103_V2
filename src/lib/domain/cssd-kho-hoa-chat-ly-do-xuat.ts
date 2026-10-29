/** Lý do phiếu Xuất kho hóa chất (PO 2026-10-29: cấm sửa số tồn, hàng rời kho phải có lý do). */
export const LY_DO_XUAT = ["CAP_SU_DUNG", "HET_HAN_HUY", "VO_HONG", "THAT_THOAT", "KIEM_KE_THIEU"] as const;
export type LyDoXuat = (typeof LY_DO_XUAT)[number];

export const LY_DO_XUAT_LABEL: Record<LyDoXuat, string> = {
  CAP_SU_DUNG: "Cấp sử dụng",
  HET_HAN_HUY: "Hết hạn, hủy",
  VO_HONG: "Vỡ, hỏng",
  THAT_THOAT: "Thất thoát",
  KIEM_KE_THIEU: "Kiểm kê thiếu",
};

export function isLyDoXuat(v: unknown): v is LyDoXuat {
  return typeof v === "string" && (LY_DO_XUAT as readonly string[]).includes(v);
}

export function lyDoXuatLabel(v: unknown): string | null {
  return isLyDoXuat(v) ? LY_DO_XUAT_LABEL[v] : null;
}

/** Chỉ xuất lô quá hạn khi lý do là hủy hết hạn; mọi lý do khác chặn. */
export function canXuatLoQuaHan(lyDo: unknown): boolean {
  return lyDo === "HET_HAN_HUY";
}

/** Lô còn hạn không được xuất với lý do hủy hết hạn. */
export function validateLyDoXuat(lyDo: unknown, loQuaHan: boolean): string | null {
  if (!isLyDoXuat(lyDo)) return "Chọn lý do xuất.";
  if (lyDo === "HET_HAN_HUY" && !loQuaHan) return "Lý do «Hết hạn, hủy» chỉ dùng cho lô đã quá hạn.";
  if (loQuaHan && lyDo !== "HET_HAN_HUY") return "Lô đã quá hạn chỉ xuất với lý do «Hết hạn, hủy».";
  return null;
}
