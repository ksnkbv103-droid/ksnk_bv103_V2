// src/modules/cssd-erp/types/catalog.types.ts

export interface CSSDBo {
  id: string;
  ma_bo: string;
  ten_bo: string;
  loai_dung_cu_id: string | null;
  is_active: boolean;
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
}

export interface CSSDLoai {
  id: string;
  ma_loai_dung_cu: string;
  ten_loai_dung_cu: string;
  is_active: boolean;
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
