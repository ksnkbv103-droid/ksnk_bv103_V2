/** Kiểu dùng chung module Bảng kiểm (tránh any tại form/table). */

import type { BangKiemApDungJsonb } from "@/lib/domain/bang-kiem-ap-dung";

export type TieuChiBangKiem = {
  id: string;
  stt?: number;
  ma_tc?: string | null;
  noi_dung?: string;
  ghi_chu?: string | null;
  diem_toi_da?: number;
  is_active?: boolean;
  bang_kiem_id?: string;
  kieu_du_lieu?: string | null;
  la_then_chot?: boolean | null;
  cho_phep_kpa?: boolean | null;
  cac_lua_chon?: string[] | null;
  nguong_min?: number | null;
  nguong_max?: number | null;
  don_vi?: string | null;
  weight_type?: string | null;
  weightType?: string | null;
  is_red_flag?: boolean | null;
  isRedFlag?: boolean | null;
  [key: string]: unknown;
};

export type DanhMucBangKiem = {
  id: string;
  ma_bk?: string;
  /** Alias cũ từ một nguồn import — ưu tiên hiển thị `ten_bang_kiem`. */
  ten_bk?: string;
  ten_bang_kiem?: string;
  mo_ta?: string | null;
  phan_loai_chuyen_mon?: string | null;
  loai_hinh_giam_sat?: string | null;
  is_active?: boolean;
  ap_dung_jsonb?: BangKiemApDungJsonb | Record<string, unknown> | null;
  loai_giam_sat?: string | null;
  cach_tinh_diem?: string | null;
  tieu_chi_bang_kiem?: TieuChiBangKiem[];
  [key: string]: unknown;
};
