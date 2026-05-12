/** Shared types + helpers (không phải Server Action — dùng được từ Client Component). */

export type ComplianceDashboardGroupRow = {
  id: string;
  ten: string;
  dat: number;
  tong: number;
  ty_le: number;
  so_phien: number;
};

export type ComplianceDashboardViolationRow = {
  criterion_id: string;
  ten_tieu_chi: string;
  so_vi_pham: number;
  tong_quan_sat: number;
  ty_le_vi_pham: number;
};

export type ComplianceDashboardPayload = {
  tu_ngay: string;
  den_ngay: string;
  options: {
    bang_kiem: { id: string; label: string }[];
    khoi: { id: string; label: string }[];
    khoa: { id: string; label: string; khoi_id?: string }[];
    nghe_nghiep: { id: string; label: string }[];
    khu_vuc: { id: string; label: string }[];
  };
  summary: {
    tong_phien: number;
    tong_quan_sat: number;
    tong_vi_pham: number;
    ty_le_tuan_thu: number;
  };
  by_khoa: ComplianceDashboardGroupRow[];
  by_nghe_nghiep: ComplianceDashboardGroupRow[];
  by_khu_vuc: ComplianceDashboardGroupRow[];
  trend: { ky: string; label: string; dat: number; tong: number; ty_le: number }[];
  top5_khoa: ComplianceDashboardGroupRow[];
  bottom5_khoa: ComplianceDashboardGroupRow[];
  rank_khoa: Array<ComplianceDashboardGroupRow & { stt: number; nhom_mau: "GREEN" | "RED" | "BLUE" }>;
  violations: ComplianceDashboardViolationRow[];
  supervision_sources: { ten: string; so_phien: number }[];
  participation: { id: string; ten: string; so_phien: number }[];
};

export function buildEmptyComplianceDashboardPayload(
  tuStr: string,
  denStr: string
): ComplianceDashboardPayload {
  return {
    tu_ngay: tuStr,
    den_ngay: denStr,
    options: { bang_kiem: [], khoi: [], khoa: [], nghe_nghiep: [], khu_vuc: [] },
    summary: { tong_phien: 0, tong_quan_sat: 0, tong_vi_pham: 0, ty_le_tuan_thu: 0 },
    by_khoa: [],
    by_nghe_nghiep: [],
    by_khu_vuc: [],
    trend: [],
    top5_khoa: [],
    bottom5_khoa: [],
    rank_khoa: [],
    violations: [],
    supervision_sources: [],
    participation: [],
  };
}
