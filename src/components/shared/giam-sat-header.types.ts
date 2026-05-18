/** Tách file để tránh import vòng giữa GiamSatHeader ↔ GiamSatHeaderFields / PersonalFields */

export type NhanSuOption = {
  id?: string;
  khoa_id?: string;
  nghe_nghiep_id?: string;
  vai_tro_he_thong_ksnk?: string | null;
  [key: string]: unknown;
};

export type GiamSatSession = {
  khoa_id: string;
  khu_vuc_id: string;
  vi_tri: string;
  hinh_thuc_giam_sat?: string;
  hinh_thuc_id?: string;
  cach_thuc_giam_sat?: string;
  cach_thuc_id?: string;
  nguoi_giam_sat_id: string;
  ngay_giam_sat: string;
  thoi_gian_bat_dau?: string;
  /** Ghi nhận lúc bấm lưu phiên (ISO); hiển thị trên phiếu in & DB. */
  thoi_gian_ket_thuc?: string;
  is_giam_sat_ca_nhan?: boolean;
  nghe_nghiep_id?: string;
  nhan_vien_id?: string;
  is_manual_nhan_vien?: boolean;
  ten_manual_nhan_vien?: string;
  ghi_chu_chung?: string;
  /** GSC: bổ sung người bệnh đang chăm sóc (gói phòng ngừa NKBV). */
  is_bo_sung_nguoi_benh?: boolean;
  ma_nguoi_benh?: string;
  ten_nguoi_benh?: string;
  so_giuong_nguoi_benh?: string;
};
