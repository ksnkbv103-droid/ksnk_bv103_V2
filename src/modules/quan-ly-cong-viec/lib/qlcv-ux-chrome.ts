/** Class UX Kanban attention (SSOT). */

import { isQlcvBoardOverdue } from "./qlcv-board-lanes";

export function qlcvKanbanCardAttentionClass(task: {
  muc_do_uu_tien?: string | null;
  loai_cong_viec?: string | null;
  is_qua_han?: boolean | null;
  trang_thai?: string | null;
  han_hoan_thanh?: string | null;
}): string {
  const overdue = isQlcvBoardOverdue(task);
  const urgent = task.muc_do_uu_tien === "CAO" || task.loai_cong_viec === "KHAN_CAP";
  if (overdue) return "bv103-card-pulse-overdue ring-1 ring-red-200/80";
  if (urgent) return "bv103-card-pulse-urgent ring-1 ring-amber-200/80";
  return "";
}
