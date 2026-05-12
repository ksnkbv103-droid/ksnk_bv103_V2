/** Kiểu dùng chung module Bảng kiểm (tránh any tại form/table). */

export type TieuChiBangKiem = {
  id: string;
  stt?: number;
  ma_tc?: string | null;
  noi_dung?: string;
  ghi_chu?: string | null;
  diem_toi_da?: number;
  is_active?: boolean;
  bang_kiem_id?: string;
  [key: string]: unknown;
};

export type DanhMucBangKiem = {
  id: string;
  ma_bk?: string;
  /** Alias cũ từ một nguồn import — ưu tiên hiển thị `ten_bang_kiem`. */
  ten_bk?: string;
  ten_bang_kiem?: string;
  mo_ta?: string | null;
  nhom_chuyen_de?: string | null;
  loai_hinh_giam_sat?: string | null;
  is_active?: boolean;
  tieu_chi_bang_kiem?: TieuChiBangKiem[];
  [key: string]: unknown;
};
