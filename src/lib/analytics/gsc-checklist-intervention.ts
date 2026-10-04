import type {
  GscChecklistOverviewRow,
  GscStrategicPayload,
} from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { resolveChecklistOverview } from "@/lib/analytics/gsc-analytics-data";
import {
  partitionChecklistOverviewByMinN,
  pickTopInterventionChecklists,
  sortChecklistOverviewByRisk,
} from "@/lib/analytics/gsc-checklist-analytics";

export { resolveChecklistOverview };

/** SSOT pipeline: payload GSC → overview đủ min-N, xếp rủi ro (GSC-05). */
export function resolveSortedChecklistOverview(
  payload: GscStrategicPayload | null | undefined,
): GscChecklistOverviewRow[] {
  return partitionChecklistOverviewByMinN(resolveChecklistOverview(payload)).attention;
}

/** BK chưa đủ min-N — nhóm «mẫu mỏng», không xếp hạng. */
export function resolveThinChecklistOverview(
  payload: GscStrategicPayload | null | undefined,
): GscChecklistOverviewRow[] {
  return partitionChecklistOverviewByMinN(resolveChecklistOverview(payload)).thin;
}

/** Toàn bộ (đủ + mỏng) — dùng khi «Xem mọi bảng kiểm». */
export function resolveAllSortedChecklistOverview(
  payload: GscStrategicPayload | null | undefined,
): GscChecklistOverviewRow[] {
  const { attention, thin } = partitionChecklistOverviewByMinN(resolveChecklistOverview(payload));
  return [...attention, ...thin];
}

/** SSOT pipeline: payload GSC → top N BK cần can thiệp. */
export function resolveTopInterventionChecklists(
  payload: GscStrategicPayload | null | undefined,
  limit = 5,
): GscChecklistOverviewRow[] {
  return pickTopInterventionChecklists(resolveChecklistOverview(payload), limit);
}
