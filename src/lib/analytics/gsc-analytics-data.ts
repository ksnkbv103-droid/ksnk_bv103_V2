import { gscCompliancePercentFromCounts } from "@/modules/giam-sat-chung/lib/gsc-score-display";
import type {
  GscChecklistDetailPayload,
  GscChecklistOverviewRow,
  GscStrategicPayload,
} from "@/modules/giam-sat-chung/types/gsc-strategic.types";

function withCountsPercent<T extends { tong_quan_sat?: number; tong_dat?: number; ty_le_tuan_thu?: number | null }>(
  row: T,
): T {
  const pct = gscCompliancePercentFromCounts(row.tong_quan_sat, row.tong_dat);
  return pct == null ? row : { ...row, ty_le_tuan_thu: pct };
}

function remapGscGapRows(rows: GscStrategicPayload["gap_analysis"] | undefined) {
  return (rows ?? []).map((row) => ({
    ...row,
    ty_le_tgs: gscCompliancePercentFromCounts(row.tgs_quan_sat, row.tgs_dat) ?? row.ty_le_tgs,
    ty_le_ksnk: gscCompliancePercentFromCounts(row.ksnk_quan_sat, row.ksnk_dat) ?? row.ty_le_ksnk,
  }));
}

/** GSC-2: % thống kê = Đạt/áp dụng, 2 chữ số — không dùng ROUND 1 số từ RPC. */
export function normalizeGscStrategicPercents(payload: GscStrategicPayload): GscStrategicPayload {
  return {
    ...payload,
    kpis: withCountsPercent(payload.kpis),
    trendline: (payload.trendline ?? []).map(withCountsPercent),
    matrix_khoa: (payload.matrix_khoa ?? []).map(withCountsPercent),
    matrix_khoi: payload.matrix_khoi?.map(withCountsPercent),
    matrix_khu_vuc: payload.matrix_khu_vuc?.map(withCountsPercent),
    matrix_nghe: payload.matrix_nghe?.map(withCountsPercent),
    matrix_hinh_thuc: payload.matrix_hinh_thuc?.map(withCountsPercent),
    matrix_cach_thuc: payload.matrix_cach_thuc?.map(withCountsPercent),
    checklist_overview: payload.checklist_overview?.map(withCountsPercent),
    dynamic_checklists: (payload.dynamic_checklists ?? []).map(withCountsPercent),
    gap_analysis: remapGscGapRows(payload.gap_analysis),
  };
}

export function normalizeGscChecklistDetailPercents(
  payload: GscChecklistDetailPayload,
): GscChecklistDetailPayload {
  return {
    ...payload,
    kpis: withCountsPercent(payload.kpis),
    trendline: (payload.trendline ?? []).map(withCountsPercent),
    matrix_khoa: (payload.matrix_khoa ?? []).map(withCountsPercent),
    matrix_khoi: payload.matrix_khoi?.map(withCountsPercent),
    matrix_khu_vuc: payload.matrix_khu_vuc?.map(withCountsPercent),
    matrix_nghe: payload.matrix_nghe?.map(withCountsPercent),
    matrix_hinh_thuc: payload.matrix_hinh_thuc?.map(withCountsPercent),
    matrix_cach_thuc: payload.matrix_cach_thuc?.map(withCountsPercent),
    matrix_criterion: (payload.matrix_criterion ?? []).map(withCountsPercent),
    gap_analysis: remapGscGapRows(payload.gap_analysis),
  };
}

/** Cụm biểu mẫu chỉ hiện khi có phiên hoặc tiêu chí áp dụng trong kỳ lọc. */
export function gscAnalyticsPayloadHasData(payload: GscStrategicPayload | null | undefined): boolean {
  if (!payload) return false;
  const kpis = payload.kpis;
  if ((kpis?.tong_phien ?? 0) > 0) return true;
  if ((kpis?.tong_quan_sat ?? 0) > 0) return true;
  return (payload.trendline ?? []).some((t) => (t.tong_quan_sat ?? 0) > 0);
}

/** SSOT danh sách BK từ RPC — fallback dynamic_checklists khi chưa migrate. */
export function resolveChecklistOverview(payload: GscStrategicPayload | null | undefined): GscChecklistOverviewRow[] {
  if (!payload) return [];
  if (payload.checklist_overview?.length) return payload.checklist_overview;
  return (payload.dynamic_checklists ?? []).map((c) => ({
    ma_bk: c.ma_bk,
    ten_bang_kiem: c.ten_bang_kiem,
    tong_phien: c.tong_phien,
    tong_quan_sat: c.tong_quan_sat,
    tong_dat: c.tong_dat,
    tong_vi_pham: c.tong_vi_pham ?? Math.max(0, c.tong_quan_sat - c.tong_dat),
    ty_le_tuan_thu: c.ty_le_tuan_thu,
    worst_khoa_ten: null,
    worst_khoa_ty_le: null,
    top_violation_ten: null,
    top_violation_so: null,
  }));
}
