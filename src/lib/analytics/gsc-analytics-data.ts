import type {
  GscChecklistOverviewRow,
  GscStrategicPayload,
} from "@/modules/giam-sat-chung/types/gsc-strategic.types";

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
