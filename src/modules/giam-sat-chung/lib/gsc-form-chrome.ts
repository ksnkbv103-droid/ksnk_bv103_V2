import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

/**
 * GSC form phiên — compose từ `bv103LayoutChrome` + token riêng module.
 * @see docs/modules/giam-sat/layout-primitives.md
 */
export const gscFormChrome = {
  panelShell: bv103LayoutChrome.panelShellPadded,
  textareaLarge: bv103LayoutChrome.textarea,
  textareaCriterionNote: bv103LayoutChrome.textareaCompact,
  labelBlock: bv103LayoutChrome.labelField,
  labelBlockAccent: bv103LayoutChrome.labelBlockAccent,
  choiceBtn: bv103LayoutChrome.choiceBtn,
  /** Hàng nút Đạt/Không đạt trên checklist — không kéo full width. */
  choiceBtnRow: bv103LayoutChrome.choiceBtnInline,
  choiceBtnIdle: bv103LayoutChrome.choiceBtnIdle,
  choiceBtnActive: bv103LayoutChrome.choiceBtnActive,
  choiceBtnActiveDanger: bv103LayoutChrome.choiceBtnActiveDanger,
  choiceBtnNote:
    "border-amber-200/90 bg-amber-50/90 text-amber-900 hover:bg-amber-50",
  choiceBtnEvidence:
    "border-emerald-200 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
  noteToggle:
    "bv103-control-h rounded-[var(--radius-control)] border px-4 text-[11px] font-semibold uppercase tracking-wide shadow-sm transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/15",
} as const;
