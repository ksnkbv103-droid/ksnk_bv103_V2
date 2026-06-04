import type { CongViecView } from "../types";

/** Gộp việc active + đề xuất chờ (dedupe theo id). */
export function mergeQlcvKanbanTasks(
  activeTasks: CongViecView[],
  pendingProposals: CongViecView[],
): CongViecView[] {
  const activeIds = new Set(activeTasks.map((t) => t.id));
  const extras = pendingProposals.filter((p) => !activeIds.has(p.id));
  return [...extras, ...activeTasks];
}
