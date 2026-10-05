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

/** Mã viết tắt domain 11:86–90 — TĐ1/TĐ4 tách riêng (VST-08). */
export const MOMENT_SHORT_CODE: Record<MomentType, string> = {
  "Trước khi tiếp xúc người bệnh": "T-NB",
  "Trước khi làm thủ thuật vô khuẩn": "T-VK",
  "Sau khi có nguy cơ tiếp xúc với dịch": "S-DCT",
  "Sau khi tiếp xúc người bệnh": "S-NB",
  "Sau khi tiếp xúc xung quanh người bệnh": "S-XQ NB",
};

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

/** Nhãn nút hành động (DB giữ «Rửa tay bằng nước»). */
export const ACTION_DISPLAY_LABEL: Record<ActionType, string> = {
  "Rửa tay bằng nước": "Rửa tay với xà phòng và nước",
  "Chà tay bằng cồn": "Chà tay bằng cồn",
  "Bỏ sót": "Bỏ sót",
};

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

/** WHO W4: một cơ hội nhận 1–5 thời điểm cho mọi hành động. */
export const VST_MAX_MOMENTS_PER_OPP = 5;

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
