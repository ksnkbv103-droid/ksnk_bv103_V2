// src/modules/cssd-erp/types/catalog.types.ts

export interface CSSDBo {
  id: string;
  ma_bo: string;
  ten_bo: string;
  loai_dung_cu_id: string | null;
  is_active: boolean;
  phan_loai_bo?: string | null;
  co_ma_dinh_danh_rieng?: boolean | null;
  so_luong_bo?: number | null;
  so_khoan?: number | null;
  tong_so_luong_dung_cu?: number | null;
  khoa_su_dung_id?: string | null;
  ten_khoa?: string | null;
}

export interface CSSDChiTiet {
  id: string;
  ma_chi_tiet: string;
  ten_chi_tiet: string;
  so_luong: number | null;
  bo_dung_cu_id: string | null;
  ten_bo: string | null;
  loai_dung_cu_id: string | null;
  ten_loai: string | null;
  is_active: boolean;
  max_suds_count?: number | null;
  trong_luong?: number | null;
  ghi_chu?: string | null;
  ma_qr_mau?: string | null;
}

export interface CSSDLoai {
  id: string;
  ma_loai_dung_cu: string;
  ten_loai_dung_cu: string;
  is_active: boolean;
  phan_loai?: string | null;
  so_luong_kho_du_phong?: number | null;
  so_luong_tong?: number | null;
  hinh_dang?: string | null;
  kich_thuoc?: string | null;
  cong_dung?: string | null;
  kha_nang_chiu_nhiet?: string | null;
  phuong_phap_tiet_khuan?: string | null;
}

export interface CSSDHoaChat {
  id: string;
  ma_hoa_chat: string;
  ten_hoa_chat: string;
  loai_hoa_chat: string | null;
  don_vi_tinh: string | null;
  is_active: boolean;
}

export interface Catalog {
  bo: CSSDBo[];
  chi_tiet: CSSDChiTiet[];
  loai: CSSDLoai[];
  hoa_chat: CSSDHoaChat[];
}

