/** Chuỗi lưu DB / RPC — giữ nguyên (prod đã có đúng 5 nhãn). */
export const MOMENTS = [
  "Trước khi tiếp xúc người bệnh",
  "Trước khi làm thủ thuật vô khuẩn",
  "Sau khi có nguy cơ tiếp xúc với dịch",
  "Sau khi tiếp xúc người bệnh",
  "Sau khi tiếp xúc xung quanh người bệnh",
] as const;

export type MomentType = (typeof MOMENTS)[number];

/** Nhãn hiển thị QT.07 / WHO — map 1:1, không đổi chuỗi DB (VST-08). */
export const MOMENT_DISPLAY_LABEL: Record<MomentType, string> = {
  "Trước khi tiếp xúc người bệnh": "Trước khi tiếp xúc người bệnh",
  "Trước khi làm thủ thuật vô khuẩn": "Trước khi làm thủ thuật vô khuẩn",
  "Sau khi có nguy cơ tiếp xúc với dịch":
    "Sau khi có nguy cơ phơi nhiễm với máu và dịch cơ thể",
  "Sau khi tiếp xúc người bệnh": "Sau khi tiếp xúc người bệnh",
  "Sau khi tiếp xúc xung quanh người bệnh":
    "Sau khi tiếp xúc với môi trường xung quanh người bệnh",
};

/** Mã viết tắt — TĐ1/TĐ4 cùng gốc TXNB, tách bằng TRƯỚC/SAU trên UI. */
export const MOMENT_SHORT_CODE: Record<MomentType, string> = {
  "Trước khi tiếp xúc người bệnh": "TXNB",
  "Trước khi làm thủ thuật vô khuẩn": "TTVK",
  "Sau khi có nguy cơ tiếp xúc với dịch": "TXDCT",
  "Sau khi tiếp xúc người bệnh": "TXNB",
  "Sau khi tiếp xúc xung quanh người bệnh": "TXXQNB",
};

/** Nhãn ô form / chip — một dòng, đủ phân biệt 5 thời điểm WHO. */
export const MOMENT_UI_LABEL: Record<MomentType, string> = {
  "Trước khi tiếp xúc người bệnh": "TRƯỚC TXNB",
  "Trước khi làm thủ thuật vô khuẩn": "TRƯỚC TTVK",
  "Sau khi có nguy cơ tiếp xúc với dịch": "SAU TXDCT",
  "Sau khi tiếp xúc người bệnh": "SAU TXNB",
  "Sau khi tiếp xúc xung quanh người bệnh": "SAU TXXQNB",
};

export function momentUiLabel(raw: string | null | undefined): string {
  const key = String(raw ?? "").trim();
  if ((MOMENTS as readonly string[]).includes(key)) {
    return MOMENT_UI_LABEL[key as MomentType];
  }
  return key;
}

export function momentDisplayLabel(raw: string | null | undefined): string {
  const key = String(raw ?? "").trim();
  if ((MOMENTS as readonly string[]).includes(key)) {
    return MOMENT_DISPLAY_LABEL[key as MomentType];
  }
  return key;
}

export const ACTIONS = [
  "Rửa tay bằng nước",
  "Chà tay bằng cồn",
  "Bỏ sót",
] as const;

export type ActionType = (typeof ACTIONS)[number];

/** Nhãn dài (tooltip / in / export) — DB giữ «Rửa tay bằng nước». */
export const ACTION_DISPLAY_LABEL: Record<ActionType, string> = {
  "Rửa tay bằng nước": "Rửa tay với xà phòng và nước",
  "Chà tay bằng cồn": "Chà tay bằng cồn",
  "Bỏ sót": "Bỏ sót",
};

/** Nhãn ô form hành động — gọn, đồng bộ 3 ô. */
export const ACTION_UI_LABEL: Record<ActionType, string> = {
  "Rửa tay bằng nước": "RỬA TAY",
  "Chà tay bằng cồn": "CHÀ CỒN",
  "Bỏ sót": "BỎ SÓT",
};

export function actionUiLabel(raw: string | null | undefined): string {
  const key = String(raw ?? "").trim();
  if ((ACTIONS as readonly string[]).includes(key)) {
    return ACTION_UI_LABEL[key as ActionType];
  }
  return key;
}

export function actionDisplayLabel(raw: string | null | undefined): string {
  const key = String(raw ?? "").trim();
  if ((ACTIONS as readonly string[]).includes(key)) {
    return ACTION_DISPLAY_LABEL[key as ActionType];
  }
  return key;
}

/** Bỏ sót = không tuân thủ. */
export function isVstMissedAction(hanhDong: string | null | undefined): boolean {
  return hanhDong === "Bỏ sót";
}

/**
 * Domain §2.1 / QT.07: một cơ hội tuân thủ (rửa / chà) ≤ 2 chỉ định;
 * không tuân thủ (bỏ sót) ≤ 1 chỉ định. Không bắt đủ 5 mốc trên một cơ hội.
 */
export const VST_MAX_MOMENTS_COMPLIANT = 2;
export const VST_MAX_MOMENTS_MISSED = 1;

/** @deprecated dùng maxMomentsForAction — trần tuyệt đối = tuân thủ (2). */
export const VST_MAX_MOMENTS_PER_OPP = VST_MAX_MOMENTS_COMPLIANT;

export function maxMomentsForAction(hanhDong: string | null | undefined): number {
  return isVstMissedAction(hanhDong) ? VST_MAX_MOMENTS_MISSED : VST_MAX_MOMENTS_COMPLIANT;
}

/** Cắt danh sách thời điểm theo trần hành động (giữ thứ tự đã chọn). */
export function clampMomentsForAction<T>(moments: readonly T[], hanhDong: string | null | undefined): T[] {
  const cap = maxMomentsForAction(hanhDong);
  return moments.length > cap ? moments.slice(0, cap) : [...moments];
}

/**
 * Bấm thêm một thời điểm. Đã chọn thì bỏ. Quá trần §2.1 thì bỏ lựa chọn cũ nhất,
 * giữ các lựa chọn mới — không chặn bằng cảnh báo.
 */
export function admitMoment<T>(selected: readonly T[], moment: T, cap: number): T[] {
  if (selected.includes(moment)) return selected.filter((item) => item !== moment);
  const next = [...selected, moment];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

export interface VSTOpportunity {
  thoi_diems: MomentType[];
  hanh_dong: ActionType | null;
  dung_ky_thuat: boolean | null;
  du_thoi_gian: boolean | null;
  co_deo_gang: boolean | null;
  thoi_gian_ghi_nhan?: string;
}

export interface VSTObservation {
  id?: string;
  nhan_vien_id: string | null;
  khoa_id: string;
  khu_vuc_id?: string | null;
  khu_vuc: string;
  vi_tri: string;
  nghe_nghiep_id?: string | null;
  nghe_nghiep: string;
  hinh_thuc_giam_sat?: string;
  ten_nhan_vien_ngoai?: string;
  ngay_giam_sat: string;
  thoi_gian_bat_dau?: string;
  thoi_gian_ket_thuc?: string;
  nguoi_giam_sat_id: string;
  opportunities: VSTOpportunity[];
  created_at?: string;
}
