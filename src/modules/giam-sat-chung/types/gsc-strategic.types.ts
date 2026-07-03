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
  matrix_khoa: { id: string; ma_khoa?: string; ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_khoi?: { ten: string; ma_khoi?: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_khu_vuc?: { ten: string; ma_nhom?: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_khu_vuc_nhom?: { ma_nhom: string; ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_nghe?: { ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_hinh_thuc?: { ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  matrix_cach_thuc?: { ten: string; tong_quan_sat: number; tong_dat: number; ty_le_tuan_thu: number }[];
  top_violations: {
    criterion_id: string;
    ten_tieu_chi: string;
    ma_bk?: string;
    ten_bang_kiem: string;
    so_vi_pham: number;
    tong_quan_sat: number;
    ty_le_vi_pham: number;
  }[];
  checklist_overview?: GscChecklistOverviewRow[];
  gap_analysis: {
    id: string;
    ma_khoa?: string;
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
    tong_vi_pham?: number;
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

export type GscChecklistOverviewRow = {
  ma_bk: string;
  ten_bang_kiem: string;
  tong_phien: number;
  tong_quan_sat: number;
  tong_dat: number;
  tong_vi_pham: number;
  ty_le_tuan_thu: number;
  worst_khoa_ten: string | null;
  worst_khoa_ty_le: number | null;
  top_violation_ten: string | null;
  top_violation_so: number | null;
};

export type GscCriterionMatrixRow = {
  criterion_id: string;
  ten_tieu_chi: string;
  stt?: number;
  tong_quan_sat: number;
  tong_dat: number;
  tong_vi_pham: number;
  ty_le_tuan_thu: number | null;
};

export type GscChecklistCriterionKhoaRow = {
  criterion_id: string;
  khoa_id: string;
  ma_khoa?: string;
  ten: string;
  tong_quan_sat: number;
  tong_vi_pham: number;
  ty_le_vi_pham: number;
};

export type GscChecklistDetailPayload = {
  ma_bk: string;
  ten_bang_kiem: string | null;
  kpis: GscStrategicKpis;
  trendline: GscStrategicPayload["trendline"];
  matrix_khoa: (GscStrategicPayload["matrix_khoa"][number] & { tong_vi_pham?: number })[];
  matrix_criterion: GscCriterionMatrixRow[];
  criterion_khoa: GscChecklistCriterionKhoaRow[];
  gap_analysis: GscStrategicPayload["gap_analysis"];
  matrix_khoi?: GscStrategicPayload["matrix_khoi"];
  matrix_khu_vuc?: GscStrategicPayload["matrix_khu_vuc"];
  matrix_khu_vuc_nhom?: GscStrategicPayload["matrix_khu_vuc_nhom"];
  matrix_nghe?: GscStrategicPayload["matrix_nghe"];
  matrix_hinh_thuc?: GscStrategicPayload["matrix_hinh_thuc"];
  matrix_cach_thuc?: GscStrategicPayload["matrix_cach_thuc"];
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
