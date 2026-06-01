export const MOMENTS = [
  "Trước khi tiếp xúc người bệnh",
  "Trước khi làm thủ thuật vô khuẩn",
  "Sau khi có nguy cơ tiếp xúc với dịch",
  "Sau khi tiếp xúc người bệnh",
  "Sau khi tiếp xúc xung quanh người bệnh",
] as const;

/** RPC: cơ hội không tách được mốc nào từ `thoi_diem` (ô trống / dữ liệu cũ). */
const VST_DASHBOARD_MOMENT_GAP_LABEL = "— Chưa ghi thời điểm trong phiếu" as const;

export type MomentType = (typeof MOMENTS)[number];

export const ACTIONS = [
  "Rửa tay bằng nước",
  "Chà tay bằng cồn",
  "Bỏ sót",
] as const;

export type ActionType = (typeof ACTIONS)[number];

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
