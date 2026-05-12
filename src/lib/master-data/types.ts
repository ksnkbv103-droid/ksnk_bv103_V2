export interface DanhMucItem {
  id: string;
  ma_danh_muc: string;
  ten_danh_muc: string;
  loai_danh_muc?: string | null;
  is_active: boolean;
  extra_data?: Record<string, unknown> | null;
}
