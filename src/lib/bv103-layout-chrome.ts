/**
 * SSOT layout / form surface toàn BV103 (mức 0 — chỉ chuỗi class).
 * Module: compose thêm trong `lib/<module>-*-chrome.ts` hoặc import trực tiếp.
 * @see docs/specs/working/BV103_LAYOUT_PRIMITIVES.md
 */

const panelSurface =
  "rounded-2xl border border-slate-200/90 bg-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]";

export const bv103LayoutChrome = {
  /** Bề mặt panel (không padding) — caller tự thêm `p-*` / grid */
  panelSurface,
  /** Panel form có padding chuẩn */
  panelShellPadded: `${panelSurface} p-5`,
  /** Textarea dài (mô tả, nhận xét chung) */
  textarea:
    "min-h-[7.5rem] w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15",
  /** Textarea ngắn hơn (ghi chú theo dòng / tiêu chí) */
  textareaCompact:
    "min-h-[5.5rem] w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15",
  labelBlock: "mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  labelBlockInline: "text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  labelBlockAccent: "text-[11px] font-semibold uppercase tracking-wider text-[var(--primary)]",
  noticeAmber:
    "rounded-2xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs font-medium text-amber-950",
  noticeSlate:
    "rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700",
  noticeSlateRelaxed:
    "rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-slate-700",
  noticeViolet:
    "rounded-2xl border border-violet-100 bg-violet-50/90 px-4 py-3 text-xs font-medium text-violet-900",
} as const;
