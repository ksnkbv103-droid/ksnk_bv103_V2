import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

/** Cụm biểu mẫu chỉ hiện khi có phiên hoặc tiêu chí áp dụng trong kỳ lọc. */
export function gscAnalyticsPayloadHasData(payload: GscStrategicPayload | null | undefined): boolean {
  if (!payload) return false;
  const kpis = payload.kpis;
  if ((kpis?.tong_phien ?? 0) > 0) return true;
  if ((kpis?.tong_quan_sat ?? 0) > 0) return true;
  return (payload.trendline ?? []).some((t) => (t.tong_quan_sat ?? 0) > 0);
}
