export type GscStrategicKpis = {
  tong_phien: number;
  tong_quan_sat: number;
  tong_dat: number;
  tong_vi_pham: number;
  ty_le_tuan_thu: number;
};

export type GscStrategicPayload = {
  kpis: GscStrategicKpis;
  trendline: { label: string; min_date: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_khoa: { id: string; ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  top_violations: {
    criterion_id: string;
    ten_tieu_chi: string;
    ten_bang_kiem: string;
    so_vi_pham: number;
    tong_quan_sat: number;
    ty_le_vi_pham: number;
  }[];
  gap_analysis: {
    id: string;
    ten: string;
    tgs_quan_sat: number;
    tgs_dat: number;
    ty_le_tgs: number | null;
    ksnk_quan_sat: number;
    ksnk_dat: number;
    ty_le_ksnk: number | null;
    do_lech: number | null;
  }[];
  dynamic_checklists: {
    ma_bk: string;
    ten_bang_kiem: string;
    tong_phien: number;
    tong_quan_sat: number;
    tong_dat: number;
    ty_le_tuan_thu: number;
  }[];
  workload: {
    khoa_tu_giam_sat: number;
    khoa_duoc_ksnk_giam_sat: number;
    chuyen_de_duoc_ksnk_phu: number;
    ksnk_so_phien: number;
    co_cau_giam_sat: { ten: string; so_phien: number }[];
  };
};

export type GscStrategicFilters = {
  tu_ngay: string;
  den_ngay: string;
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
  bang_kiem_mas?: string[];
};
