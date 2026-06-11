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
  sectionGap: "space-y-4",
  sectionGapLg: T.pageSectionGap,

  /** Typography panel */
  panelTitle: T.sectionTitle,
  panelSubtitle: T.pageEyebrow,
  sectionTitle: T.sectionTitle,
  emptyTitle: "text-sm font-semibold text-slate-500",
  emptyBody: "text-sm font-normal leading-relaxed text-slate-400",

  /** Form */
  formLabel: C.labelField,
  formLabelBlock: C.labelBlock,
  formSection: "space-y-4",
  formRow: "grid gap-4 sm:grid-cols-2",
  modalTitle: "text-lg font-semibold tracking-tight text-slate-900 md:text-xl",
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
  btnTouch: "text-[11px] font-semibold uppercase tracking-wide",
  /** Badge trạng thái — title case, không IN HOA */
  statusBadge:
    "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",

  noticeSuccess: C.noticeSuccess,
  noticeWarning: C.noticeWarning,
  noticeDanger: C.noticeDanger,
  noticeInfo: C.noticeInfo,
} as const;
