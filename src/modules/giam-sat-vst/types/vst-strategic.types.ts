export type VstStrategicKpis = {
  tong_phien: number;
  tong_co_hoi: number;
  da_tuan_thu: number;
  bo_sot: number;
  loi_ky_thuat: number;
  loi_thoi_gian: number;
  lam_dung_gang: number;
  dung_ky_thuat: number;
  du_thoi_gian: number;
  ty_le_tuan_thu: number;
  ty_le_dung_ky_thuat: number;
  ty_le_du_thoi_gian: number;
  ty_le_lam_dung_gang: number;
};

export type VstStrategicPayload = {
  kpis: VstStrategicKpis;
  trendline: { label: string; min_date: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  matrix_khoa: { id: string; ma_khoa?: string; ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  matrix_nghe: { id: string; ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  matrix_khu_vuc?: { ten: string; ma_nhom?: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  matrix_khu_vuc_nhom?: { ma_nhom: string; ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  matrix_hinh_thuc?: { ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  moments: { ten: string; tong_co_hoi: number; da_tuan_thu: number; ty_le_tuan_thu: number }[];
  gap_analysis: {
    id: string;
    ma_khoa?: string;
    ten: string;
    tgs_co_hoi: number;
    tgs_dat: number;
    ty_le_tgs: number | null;
    ksnk_co_hoi: number;
    ksnk_dat: number;
    ty_le_ksnk: number | null;
    do_lech: number | null;
  }[];
  workload: {
    khoa_tu_giam_sat: number;
    khoa_duoc_ksnk_giam_sat: number;
    ksnk_so_co_hoi: number;
    ksnk_so_phien: number;
    co_cau_giam_sat: { ten: string; so_co_hoi: number }[];
  };
};

export type VstStrategicFilters = {
  tu_ngay: string;
  den_ngay: string;
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
};
