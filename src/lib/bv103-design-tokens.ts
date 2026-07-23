/**
 * SSOT typography + page rhythm BV103.
 * @see docs/reference/guides/bv103-visual-language.md
 */
export const bv103DesignTokens = {
  pageOuter:
    "w-full min-h-[40dvh] space-y-4 pb-[max(2rem,env(safe-area-inset-bottom))] [-webkit-tap-highlight-color:transparent] sm:space-y-6 sm:pb-12",
  pageOuterAnalytics:
    "w-full space-y-4 pb-[max(4rem,env(safe-area-inset-bottom))] sm:space-y-8 sm:pb-24",
  pageSectionGap: "space-y-4 sm:space-y-8",

  stickyAnalyticsShell:
    "no-print sticky top-0 z-40 rounded-xl border border-slate-200/90 bg-white/95 p-2 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-md sm:top-4 sm:p-3 md:p-4",
  /** Thanh tiêu đề + lọc analytics (một khối, không lồng hero). */
  analyticsToolbarShell:
    "no-print sticky top-0 z-40 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm backdrop-blur-md sm:top-4 sm:p-4",
  analyticsToolbarShellStatic:
    "no-print rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-4",
  /** Mục lục báo cáo — không sticky trên phone (tránh chồng header); desktop neo dưới toolbar. */
  reportSectionNav:
    "z-10 mb-4 overflow-x-auto rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1.5 backdrop-blur-sm scrollbar-hide max-md:relative max-md:top-auto md:sticky md:top-4",

  /** H1 trang — title case, không primary, không IN HOA */
  pageTitle: "text-xl font-semibold tracking-tight text-slate-900 md:text-2xl",
  pageSubtitle: "mt-2 max-w-2xl text-sm font-normal leading-relaxed text-slate-600",
  /** Dòng phụ list/toolbar (danh mục, breadcrumb nội dung) */
  pageEyebrow: "mt-1 text-[11px] font-medium text-slate-500",
  pageToolbar:
    "flex flex-col gap-3 rounded-[var(--radius-shell)] border border-slate-100 bg-white p-4 shadow-[var(--shadow-app-soft)] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6",

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

  /** Đồng bộ cảm giác chạm với `bv103LayoutChrome` (C+2). */
  btnPrimary:
    "bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm transition-[colors,transform] touch-manipulation hover:bg-[var(--primary-hover)] active:scale-[0.98] disabled:opacity-50",
  btnSecondary:
    "bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition-[colors,transform] touch-manipulation hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50",
  btnGhostDark:
    "bv103-control-h inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-slate-900 px-3 text-xs font-semibold text-white transition-[colors,transform] touch-manipulation hover:bg-slate-800 active:scale-[0.98]",

  skeletonBlock: "animate-pulse rounded-[var(--radius-shell)] border border-slate-200 bg-slate-100/80",
} as const;

const BV103_MIN_LABEL_CLASS = "text-[11px]" as const;
