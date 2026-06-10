/**
 * SSOT layout / form surface toàn BV103 (mức 0 — chỉ chuỗi class).
 *
 * Chuỗi áp dụng (không dùng hook — class Tailwind là literal lúc build):
 * 1. Token màu/bo góc → `src/app/globals.css` (`:root`)
 * 2. Chuỗi class TSX → file này (`bv103LayoutChrome`)
 * 3. Alias module (tùy chọn) → `*-form-chrome.ts`, `cssd-ui-chrome.ts`
 * 4. Gate hồi quy → `npm run layout:drift-check`
 *
 * Thang bo góc: control (--radius-control) · surface (--radius-shell) · chip (rounded-full).
 * @see docs/modules/giam-sat/layout-primitives.md
 */

const panelSurface =
  "rounded-[var(--radius-shell)] border border-slate-200/90 bg-white shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03]";

/** SSOT ô nhập / dropdown trigger — `--radius-control` (globals.css). */
const controlBase =
  "bv103-control-h w-full rounded-[var(--radius-control)] border border-slate-200 bg-white text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-60";

const choiceBtnBase =
  "min-h-[2.75rem] w-full rounded-[var(--radius-control)] border px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide transition-colors touch-manipulation";

/** Nút lựa chọn trên một hàng ngang (checklist GSC) — không `w-full`. */
const choiceBtnInline =
  "bv103-control-h inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] border px-3 text-[11px] font-semibold uppercase tracking-wide transition-colors touch-manipulation";

export const bv103LayoutChrome = {
  controlInput: `${controlBase} px-3`,
  controlSelectTrigger: `flex items-center text-left px-3.5 ${controlBase} hover:border-slate-300 hover:bg-slate-50/90 focus-visible:border-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/20`,
  controlSelectNative: `${controlBase} px-3.5 text-xs font-semibold hover:bg-slate-50/50`,

  labelField: "text-[11px] font-medium text-slate-500",
  sectionTitle: "text-sm font-semibold text-slate-800",

  btnPrimary:
    "bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50",
  btnPrimaryBlock:
    "bv103-control-h flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50",
  btnSecondary:
    "bv103-control-h inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50",

  choiceBtn: choiceBtnBase,
  choiceBtnInline,
  choiceBtnIdle: "border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-white",
  choiceBtnActive: "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm",
  choiceBtnActiveDanger: "border-red-500 bg-red-500 text-white shadow-sm",
  choiceBtnActiveWarning: "border-amber-500 bg-amber-500 text-white shadow-sm",

  segmentGroup: "inline-flex overflow-hidden rounded-[var(--radius-control)] border border-slate-200 shadow-sm",
  segmentBtn:
    "min-w-[4.5rem] min-h-[2.75rem] flex items-center justify-center border-r border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors last:border-r-0",
  segmentBtnIdle: "bg-white text-slate-600 hover:bg-slate-50",
  segmentBtnYes: "bg-[var(--primary)] text-white border-[var(--primary)]",
  segmentBtnNo: "bg-rose-600 text-white border-rose-600",

  chipBadge:
    "inline-flex h-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-semibold text-white",

  panelSurface,
  panelInset: "rounded-[var(--radius-shell)] border border-slate-200/90 bg-slate-50/40",
  panelShellPadded: `${panelSurface} p-5`,

  textarea:
    "min-h-[7.5rem] w-full resize-none rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15",
  textareaCompact:
    "min-h-[5.5rem] w-full resize-none rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/40 focus:ring-2 focus:ring-[var(--primary)]/15",

  labelBlock: "mb-1.5 block text-[11px] font-medium text-slate-500",
  labelBlockInline: "text-[11px] font-medium text-slate-500",
  labelBlockAccent: "text-[11px] font-medium text-[var(--primary)]",
  noticeSuccess:
    "rounded-[var(--radius-shell)] border border-[var(--surface-success-border)] bg-[var(--surface-success-bg)] px-3 py-2 text-xs font-medium text-[var(--surface-success-text)]",
  noticeWarning:
    "rounded-[var(--radius-shell)] border border-[var(--surface-warning-border)] bg-[var(--surface-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--surface-warning-text)]",
  noticeDanger:
    "rounded-[var(--radius-shell)] border border-[var(--surface-danger-border)] bg-[var(--surface-danger-bg)] px-3 py-2 text-xs font-medium text-[var(--surface-danger-text)]",
  noticeInfo:
    "rounded-[var(--radius-shell)] border border-[var(--surface-info-border)] bg-[var(--surface-info-bg)] px-3 py-2 text-xs font-medium text-[var(--surface-info-text)]",
  /** @deprecated — alias `noticeWarning` */
  noticeAmber:
    "rounded-[var(--radius-shell)] border border-[var(--surface-warning-border)] bg-[var(--surface-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--surface-warning-text)]",
  /** @deprecated — alias `noticeInfo` */
  noticeSlate:
    "rounded-[var(--radius-shell)] border border-[var(--surface-info-border)] bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700",
  noticeSlateRelaxed:
    "rounded-[var(--radius-shell)] border border-[var(--surface-info-border)] bg-slate-50 px-3 py-2.5 text-xs font-medium leading-relaxed text-slate-700",
  noticeViolet:
    "rounded-[var(--radius-shell)] border border-violet-100 bg-violet-50/90 px-4 py-3 text-xs font-medium text-violet-900",
} as const;
