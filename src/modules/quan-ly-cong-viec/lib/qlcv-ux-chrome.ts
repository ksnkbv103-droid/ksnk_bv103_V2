/** Class UX QLCV — việc con, Kanban attention (SSOT, tránh lặp trong component). */

export const qlcvSubTaskChrome = {
  list: "ml-2 space-y-2 border-l-2 border-slate-200/90 pl-3 sm:ml-3 sm:pl-4",
  row:
    "group flex items-center justify-between gap-3 rounded-r-xl border border-slate-200/70 border-l-4 border-l-slate-300 bg-slate-50/40 p-3 transition-all hover:border-l-[var(--primary)] hover:bg-slate-50/80 sm:p-4",
  iconWrap:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-400 transition-colors group-hover:border-[var(--primary)]/25 group-hover:text-[var(--primary)]",
} as const;

export function qlcvKanbanCardAttentionClass(task: {
  muc_do_uu_tien?: string | null;
  loai_cong_viec?: string | null;
  is_qua_han?: boolean | null;
  trang_thai?: string | null;
}): string {
  const overdue =
    task.is_qua_han === true ||
    task.trang_thai === "QUA_HAN" ||
    task.trang_thai === "TRE_HAN";
  const urgent = task.muc_do_uu_tien === "CAO" || task.loai_cong_viec === "KHAN_CAP";
  if (overdue) return "bv103-card-pulse-overdue ring-1 ring-red-200/80";
  if (urgent) return "bv103-card-pulse-urgent ring-1 ring-amber-200/80";
  return "";
}
