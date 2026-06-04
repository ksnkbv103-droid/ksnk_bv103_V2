import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { NkbvDashboardPayload } from "@/modules/giam-sat-nkbv/lib/nkbv-dashboard-aggregate";

export type BaoCaoChuyenDe = "ALL" | "VST" | "GSC" | "NKBV";

export type BaoCaoTrendGranularity = "week" | "month" | "quarter" | "year";

export type SourceLoadStatus = "ok" | "denied" | "error" | "skipped";

export type BaoCaoTongHopFilters = {
  tu_ngay: string;
  den_ngay: string;
  khoi_ids?: string[];
  khoa_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  hinh_thuc_ids?: string[];
  bang_kiem_mas?: string[];
  chuyen_de?: BaoCaoChuyenDe;
};

export type BaoCaoTrendPoint = {
  label: string;
  min_date: string;
  ty_le_vst: number | null;
  ty_le_gsc: number | null;
  ty_le_ccs: number | null;
  /** Khối lượng tuần (để gộp tháng/quý/năm = cộng mẫu số/mẫu tử, không trung bình %). */
  vst_tong?: number | null;
  vst_dat?: number | null;
  gsc_tong?: number | null;
  gsc_dat?: number | null;
};

export type BaoCaoKhoaRankRow = {
  id: string;
  ten: string;
  ty_le_vst: number | null;
  ty_le_gsc: number | null;
  ty_le_avg: number | null;
  tong_co_hoi_vst: number;
  tong_quan_sat_gsc: number;
};

/** So sánh 4 vùng IPAC (TR/DO/VA/XA) từ matrix_khu_vuc_nhom RPC. */
export type BaoCaoIpacZoneRow = {
  ma_nhom: string;
  ten: string;
  ty_le_vst: number | null;
  ty_le_gsc: number | null;
};

export type BaoCaoTongHopPayload = {
  filters: BaoCaoTongHopFilters;
  sources: {
    vst: SourceLoadStatus;
    gsc: SourceLoadStatus;
    nkbv: SourceLoadStatus;
  };
  errors: { vst?: string; gsc?: string; nkbv?: string };
  vst: VstStrategicPayload | null;
  gsc: GscStrategicPayload | null;
  nkbv: NkbvDashboardPayload | null;
  kpis: {
    ty_le_vst: number | null;
    ty_le_gsc: number | null;
    ty_le_ccs: number | null;
    ccs_formula_note: string | null;
    ti_le_xac_nhan_nkbv: number | null;
    tong_phieu_nkbv: number | null;
    delta_vst: number | null;
    delta_gsc: number | null;
    delta_ccs: number | null;
  };
  trend_week: BaoCaoTrendPoint[];
  trend_month: BaoCaoTrendPoint[];
  khoa_rank: BaoCaoKhoaRankRow[];
  ipac_zone_compare: BaoCaoIpacZoneRow[];
  capabilities: {
    topic_vst: boolean;
    topic_gsc: boolean;
    topic_nkbv: boolean;
    compare_khoa: boolean;
    compare_khoi: boolean;
    compare_khu_vuc: boolean;
    compare_doi_tuong: boolean;
  };
};
