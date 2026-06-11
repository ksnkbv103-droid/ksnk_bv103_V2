/** Typography + KPI tone dashboard / báo cáo BV103. */
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { bv103PanelChrome as P } from "@/lib/bv103-panel-chrome";

export const dashboardChrome = {
  ...P,
  kpiLabel: T.labelBlock,
  kpiValue: "text-3xl font-semibold tabular-nums text-slate-900",
  kpiValuePrimary: "text-3xl font-semibold tabular-nums text-[var(--primary)]",
  kpiValueLg: "text-4xl font-semibold tabular-nums",
  sectionHeading: "text-lg font-semibold text-slate-800",
  sectionHeadingSm: T.sectionTitle,
  tableHeader: T.tableHeader,
  cellCode: T.tableCellCode,
  cellTitle: T.tableCellTitle,
  cellBody: T.tableCellBody,
  cellNote: T.tableCellNote,
  cellIndex: T.tableCellIndex,
  cellMeta: T.tableCellMeta,
  filterLabel: T.labelBlock,
  ctaPrimary: T.btnPrimary,
  noticePeriod: C.noticeSuccess,
  noticeGap: C.noticeWarning,
  kpiCardTone: {
    green: "border-[var(--surface-success-border)] bg-[var(--surface-success-bg)] text-[var(--surface-success-text)]",
    yellow: "border-[var(--surface-warning-border)] bg-[var(--surface-warning-bg)] text-[var(--surface-warning-text)]",
    red: "border-[var(--surface-danger-border)] bg-[var(--surface-danger-bg)] text-[var(--surface-danger-text)]",
    neutral: "border-[var(--surface-info-border)] bg-[var(--surface-info-bg)] text-slate-900",
  },
  trafficRing: {
    green: "ring-2 ring-[var(--surface-success-border)] bg-[var(--surface-success-bg)]",
    yellow: "ring-2 ring-[var(--surface-warning-border)] bg-[var(--surface-warning-bg)]",
    red: "ring-2 ring-[var(--surface-danger-border)] bg-[var(--surface-danger-bg)]",
    neutral: "ring-2 ring-[var(--surface-info-border)] bg-[var(--surface-info-bg)]",
  },
  trafficText: {
    green: "text-[var(--surface-success-text)]",
    yellow: "text-[var(--surface-warning-text)]",
    red: "text-[var(--surface-danger-text)]",
    neutral: "text-slate-500",
  },
} as const;
