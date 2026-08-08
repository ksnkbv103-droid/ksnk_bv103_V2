/**
 * SSOT typography + page rhythm BV103.
 * @see docs/reference/guides/bv103-visual-language.md
 */
const PAGE_OUTER =
  "w-full min-h-[40vh] space-y-3 pb-6 [-webkit-tap-highlight-color:transparent] sm:space-y-4 sm:pb-8";

/** Band L1 duy nhất — page-chrome-contract-20260731 */
const PAGE_CHROME_SHELL =
  "no-print rounded-[var(--radius-shell)] border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3";
const PAGE_CHROME_SHELL_STICKY = `${PAGE_CHROME_SHELL} sticky top-0 z-40 backdrop-blur-md sm:top-4`;

export const bv103DesignTokens = {
  pageOuter: PAGE_OUTER,
  /** Alias — cùng nhịp `pageOuter` (không nhảy gap khi đổi Analytics). */
  pageOuterAnalytics: PAGE_OUTER,
  pageSectionGap: "space-y-3 sm:space-y-4",

  pageChromeShell: PAGE_CHROME_SHELL,
  pageChromeShellSticky: PAGE_CHROME_SHELL_STICKY,

  /** @deprecated Dùng `pageChromeShellSticky` */
  stickyAnalyticsShell: PAGE_CHROME_SHELL_STICKY,
  /** @deprecated Dùng `pageChromeShellSticky` */
  analyticsToolbarShell: PAGE_CHROME_SHELL_STICKY,
  /** @deprecated Dùng `pageChromeShell` */
  analyticsToolbarShellStatic: PAGE_CHROME_SHELL,

  /** H1 trong chrome — compact (App Header đã có tên trang) */
  pageTitle: "text-base font-semibold tracking-tight text-slate-900 sm:text-lg",
  pageSubtitle: "mt-0.5 max-w-2xl text-[11px] font-normal leading-snug text-slate-500 sm:text-sm",
  /** Dòng phụ list/toolbar (danh mục, breadcrumb nội dung) */
  pageEyebrow: "text-[11px] font-medium text-slate-500",
  /** @deprecated Dùng `pageChromeShell` + KsnkPageChrome */
  pageToolbar: PAGE_CHROME_SHELL,

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

  /** Input date / kỳ lọc analytics + CSSD report (FLT-DATE-01). */
  analyticsDateInput:
    "bv103-control-h min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800",

  skeletonBlock: "animate-pulse rounded-[var(--radius-shell)] border border-slate-200 bg-slate-100/80",
} as const;

export const BV103_MIN_LABEL_CLASS = "text-[11px]" as const;
