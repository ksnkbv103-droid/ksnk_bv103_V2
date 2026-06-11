/** Layout + typography chrome form/panel NKBV. */
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103PanelChrome as P } from "@/lib/bv103-panel-chrome";

const touch = "touch-manipulation active:scale-[0.98]";

export const nkbvFormChrome = {
  ...bv103LayoutChrome,
  ...P,
  formLabel: `mb-1 block ${bv103LayoutChrome.labelField}`,
  formLabelFlex: `flex flex-col gap-1 ${bv103LayoutChrome.labelField}`,
  blockSection: `block ${bv103LayoutChrome.sectionTitle}`,
  modalTitle: "text-lg font-semibold tracking-tight text-slate-900",
  panelTitle: "text-base font-semibold text-slate-800",
  statLabel: T.labelBlock,
  statValue: T.statValue,
  tableHeader: T.tableHeader,
  ctaPrimary: `${bv103LayoutChrome.btnPrimary} gap-2 px-6 shadow-sm ${touch}`,
  ctaSecondary: `${bv103LayoutChrome.btnSecondary} px-6 shadow-sm ${touch}`,
  /** Tab segment touch — giữ IN HOA */
  segmentTab:
    "flex items-center gap-2 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-300 touch-manipulation",
} as const;
