/**
 * Types cho dashboard v4 tinh gọn.
 */

export interface DashboardV4VungNguyCoRow {
  ma_khu_vuc: string;
  ten_khu_vuc: string;
  tong_so_phien: number;
  ty_le_trung_binh: number;
}

export interface DashboardV4TopViPhamRow {
  criterion_id: string;
  criterion_label: string;
  so_lan_vi_pham: number;
}

export interface DashboardV4Payload {
  tu_ngay: string;
  den_ngay: string;
  khoa_id: string | null;
  vung_nguy_co: DashboardV4VungNguyCoRow[];
  top_vi_pham: DashboardV4TopViPhamRow[];
  summary: {
    tong_so_phien: number;
    ty_le_tuan_thu_chung: number;
  };
}
