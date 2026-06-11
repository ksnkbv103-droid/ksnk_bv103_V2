/**
 * SSOT typography + page rhythm BV103.
 * @see docs/reference/guides/bv103-visual-language.md
 */
export const bv103DesignTokens = {
  pageOuter: "w-full min-h-[40vh] space-y-6 pb-12 touch-manipulation [-webkit-tap-highlight-color:transparent]",
  pageOuterAnalytics: "w-full space-y-8 pb-24",
  pageSectionGap: "space-y-8",

  stickyAnalyticsShell:
    "no-print sticky top-4 z-40 rounded-[var(--radius-shell)] border border-slate-200/90 bg-white/95 p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] backdrop-blur-md md:p-6",

  /** H1 trang — title case, không primary, không IN HOA */
  pageTitle: "text-xl font-semibold tracking-tight text-slate-900 md:text-2xl",
  pageSubtitle: "mt-2 max-w-2xl text-sm font-normal leading-relaxed text-slate-600",
  /** Dòng phụ list/toolbar (danh mục, breadcrumb nội dung) */
  pageEyebrow: "mt-1 text-[11px] font-medium text-slate-500",
  pageToolbar:
    "flex flex-col gap-4 rounded-[var(--radius-shell)] border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between",

  /** App chrome: sidebar group + zone trên Header — IN HOA duy nhất ở lớp điều hướng */
  navGroupLabel: "text-[11px] font-semibold uppercase tracking-wider text-slate-400",
  shellZone: "text-[11px] font-semibold uppercase tracking-wider text-slate-400",
  shellPage: "truncate text-sm font-semibold leading-snug text-slate-800 sm:text-base",

  sectionTitle: "text-sm font-semibold text-slate-800",
  labelBlock: "text-[11px] font-medium text-slate-500",
  labelBlockMuted: "text-[11px] font-medium text-slate-400",
  tableHeader: "text-[11px] font-medium text-slate-500",
  /** Ô bảng — dùng qua *-table-chrome / *-ui-chrome, không inline */
  tableCellCode: "font-mono text-[11px] font-medium text-[var(--primary)]",
  tableCellTitle: "text-sm font-semibold leading-snug text-slate-800",
  tableCellBody: "text-sm font-medium leading-relaxed text-slate-700",
  tableCellNote: "text-[11px] font-normal italic leading-relaxed text-slate-400",
  tableCellIndex: "text-[11px] font-medium text-slate-400",
  tableCellMeta: "text-[11px] font-medium text-slate-500",
  metaMono: "text-[11px] font-mono font-medium text-slate-400",
  statValue: "text-2xl font-semibold tabular-nums text-slate-900",
  statValueLg: "text-3xl font-semibold tabular-nums text-slate-900",
  statValueXl: "text-4xl font-semibold tabular-nums",

  /** Auth / tài khoản — title case slate */
  authBrand: "text-xl font-semibold tracking-tight text-slate-900",
  authTitle: "text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl",
  authSubtitle: "text-sm font-normal text-slate-600",
  authLabel: "mb-2 block text-sm font-medium text-slate-700",
  authInput:
    "w-full rounded-[var(--radius-control)] border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15",

  /** @deprecated Dùng `navGroupLabel` — alias tương thích */
  eyebrow: "text-[11px] font-semibold uppercase tracking-wider text-slate-400",

  btnPrimary:
    "bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50",
  btnSecondary:
    "bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50",
  btnGhostDark:
    "bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800",

  skeletonBlock: "animate-pulse rounded-[var(--radius-shell)] border border-slate-200 bg-slate-100/80",
} as const;

export const BV103_MIN_LABEL_CLASS = "text-[11px]" as const;
