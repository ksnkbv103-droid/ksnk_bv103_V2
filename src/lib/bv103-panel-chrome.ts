/**
 * SSOT panel + form surface — list / panel / form dùng chung.
 * Domain chrome (*-form-chrome) compose từ file này.
 * @see docs/reference/guides/bv103-visual-language.md
 */
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export const bv103PanelChrome = {
  /** Khối panel */
  shell: C.panelSurface,
  shellPadded: C.panelShellPadded,
  inset: C.panelInset,
  sectionGap: "bv103-stack-in",
  sectionGapLg: T.pageSectionGap,

  /** Typography panel */
  panelTitle: T.sectionTitle,
  panelSubtitle: T.pageEyebrow,
  sectionTitle: T.sectionTitle,
  emptyTitle: `${T.sectionTitle} text-slate-500`,
  emptyBody: `${T.tableCellBody} font-normal text-slate-400`,

  /** Form */
  formLabel: C.labelField,
  formLabelBlock: C.labelBlock,
  formSection: "bv103-stack-in",
  formRow: "grid gap-[var(--bv103-space-3)] sm:grid-cols-2",
  modalTitle: T.pageTitle,
  modalSubtitle: T.pageSubtitle,

  /** KPI trong panel (không font-black) */
  kpiLabel: T.labelBlock,
  kpiValue: T.statValueLg,
  kpiValueSm: T.statValue,
  kpiCaption: T.pageEyebrow,

  /** Bảng con trong panel */
  innerTableHead: T.tableHeader,
  innerTableCell: T.tableCellBody,
  innerTableCode: T.tableCellCode,

  /** Nút toolbar panel — title case */
  btnPrimary: T.btnPrimary,
  btnSecondary: T.btnSecondary,
  /** Nút touch ngắn trong panel (giữ IN HOA) */
  btnTouch: `${T.labelBlock} font-semibold uppercase tracking-wide`,
  /** Badge trạng thái — title case, không IN HOA */
  statusBadge:
    `inline-flex items-center rounded-full border px-2 py-0.5 ${T.labelBlock} font-semibold`,

  noticeSuccess: C.noticeSuccess,
  noticeWarning: C.noticeWarning,
  noticeDanger: C.noticeDanger,
  noticeInfo: C.noticeInfo,
} as const;
