import type {
  GscChecklistOverviewRow,
  GscStrategicPayload,
} from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { resolveChecklistOverview } from "@/lib/analytics/gsc-analytics-data";
import {
  pickTopInterventionChecklists,
  sortChecklistOverviewByRisk,
} from "@/lib/analytics/gsc-checklist-analytics";

export { resolveChecklistOverview };

/** SSOT pipeline: payload GSC → overview → sort theo rủi ro. */
export function resolveSortedChecklistOverview(
  payload: GscStrategicPayload | null | undefined,
): GscChecklistOverviewRow[] {
  return sortChecklistOverviewByRisk(resolveChecklistOverview(payload));
}

/** SSOT pipeline: payload GSC → top N BK cần can thiệp. */
export function resolveTopInterventionChecklists(
  payload: GscStrategicPayload | null | undefined,
  limit = 5,
): GscChecklistOverviewRow[] {
  return pickTopInterventionChecklists(resolveChecklistOverview(payload), limit);
}
