/** Layout chrome form + panel + toolbar MDM / Quản trị. */
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome as P } from "@/lib/bv103-panel-chrome";

const touch = "touch-manipulation active:scale-[0.98]";

export const quanTriFormChrome = {
  ...bv103LayoutChrome,
  ...P,
  ctaPrimary: `${bv103LayoutChrome.btnPrimary} px-5 shadow-sm ${touch}`,
  ctaSecondary: `${bv103LayoutChrome.btnSecondary} px-5 shadow-sm ${touch}`,
  ctaAmber: `bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-warning-bg)] px-5 text-xs font-semibold text-[var(--surface-warning-text)] shadow-sm transition-colors hover:bg-amber-100 disabled:opacity-50 ${touch}`,
  ctaMuted: `bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 ${touch}`,
  ctaEmerald: `bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-success-bg)] px-5 text-xs font-semibold text-[var(--surface-success-text)] shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-50 ${touch}`,
  /** Label form MDM — chữ thường, không primary */
  formLabel: `block ml-1 ${bv103LayoutChrome.labelBlock}`,
  formLabelInset: `block ml-4 ${bv103LayoutChrome.labelBlock}`,
  modalTitle: "text-lg font-semibold tracking-tight text-white md:text-xl",
  modalTitleLight: "text-lg font-semibold tracking-tight text-slate-900 md:text-xl",
  modalSubtitle: "mt-1 text-sm font-normal text-white/80",
  modalFooterBtn: "bv103-control-h px-6",
  /** Toolbar bảng MDM — đồng bộ padding/bo góc */
  pageToolbar:
    "flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-white p-6",
} as const;
