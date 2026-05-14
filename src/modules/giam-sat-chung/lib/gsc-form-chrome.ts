import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

/**
 * GSC form phiên — compose từ `bv103LayoutChrome` + token riêng module.
 * @see docs/specs/working/BV103_LAYOUT_PRIMITIVES.md
 */
export const gscFormChrome = {
  panelShell: bv103LayoutChrome.panelShellPadded,
  textareaLarge: bv103LayoutChrome.textarea,
  textareaCriterionNote: bv103LayoutChrome.textareaCompact,
  labelBlock: bv103LayoutChrome.labelBlockInline,
  labelBlockAccent: bv103LayoutChrome.labelBlockAccent,
  /** Nút phụ (ghi chú tiêu chí) — hành vi GSC */
  noteToggle:
    "bv103-control-h rounded-xl border px-4 text-[10px] font-semibold uppercase tracking-wide shadow-sm transition-[box-shadow,border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/15",
} as const;
