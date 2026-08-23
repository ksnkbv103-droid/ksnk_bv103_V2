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
  /** Khối lượng tuần (để gộp tháng/quý/năm = cộng mẫu số/mẫu tử, không trung bình %). */
  vst_tong?: number | null;
  vst_dat?: number | null;
  gsc_tong?: number | null;
  gsc_dat?: number | null;
};

export type BaoCaoKhoaRankRow = {
  id: string;
  ten: string;
  /** Mã khoa ngắn — SSOT hiển thị bảng/chart (`khoaChartLabel`). */
  label: string;
  ty_le_vst: number | null;
  ty_le_gsc: number | null;
  /** Trung bình đơn giản VST% và GSC% khi cả hai có giá trị. */
  ty_le_avg: number | null;
  tong_co_hoi_vst: number;
  tong_quan_sat_gsc: number;
  /** false khi khoa được lọc nhưng không có phiên trong kỳ. */
  has_data?: boolean;
};

export type BaoCaoTongHopPayload = {
  filters: BaoCaoTongHopFilters;
  sources: {
    vst: SourceLoadStatus;
    gsc: SourceLoadStatus;
    nkbv: SourceLoadStatus;
    cssd: SourceLoadStatus;
  };
  errors: { vst?: string; gsc?: string; nkbv?: string; cssd?: string };
  vst: VstStrategicPayload | null;
  gsc: GscStrategicPayload | null;
  nkbv: NkbvDashboardPayload | null;
  /** Phụ lục vận hành CSSD — không gộp vào VST/GSC. */
  cssd: BaoCaoCssdAppendix | null;
  kpis: {
    ty_le_vst: number | null;
    ty_le_gsc: number | null;
    ti_le_xac_nhan_nkbv: number | null;
    tong_phieu_nkbv: number | null;
    /** Chênh 2 tuần ISO cuối trên trendline — không phải so kỳ lọc. */
    delta_vst: number | null;
    delta_gsc: number | null;
  };
  /**
   * So kỳ lãnh đạo: cùng độ dài kỳ lọc liền trước.
   * Tách nhãn khỏi delta_* (2 tuần ISO).
   */
  ky_truoc: {
    tu_ngay: string;
    den_ngay: string;
    ty_le_vst: number | null;
    ty_le_gsc: number | null;
    delta_vst: number | null;
    delta_gsc: number | null;
  } | null;
  trend_week: BaoCaoTrendPoint[];
  trend_month: BaoCaoTrendPoint[];
  khoa_rank: BaoCaoKhoaRankRow[];
  capabilities: {
    topic_vst: boolean;
    topic_gsc: boolean;
    topic_nkbv: boolean;
    topic_cssd: boolean;
    compare_khoa: boolean;
    compare_khoi: boolean;
    compare_khu_vuc: boolean;
    compare_doi_tuong: boolean;
  };
};

/** Tóm tắt CSSD trên BCTH — không gộp vào VST/GSC. */
export type BaoCaoCssdAppendix = {
  san_luong_cap_phat: number;
  tong_hoan_thanh_tram: number;
  ty_le_quy_trinh_khong_su_co: number | null;
  so_bo_danh_muc: number;
  so_me_ky: number;
  ty_le_qc_dat_me: number | null;
  may_ready: number;
  may_repairing: number;
  station_volume: { station: string; label: string; completed: number }[];
  /** Proxy sở hữu danh mục — chưa SSOT khoa nhận cấp phát. */
  khoa_ownership_proxy?: {
    disclaimer: string;
    top: { ten_khoa: string; so_bo: number }[];
  } | null;
};
