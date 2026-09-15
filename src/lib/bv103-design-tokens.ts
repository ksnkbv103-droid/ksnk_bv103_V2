/**
 * SSOT typography + page rhythm BV103.
 * Cỡ / độ đậm = class `.bv103-type-*` trong globals.css (đổi :root một lần).
 * @see docs/reference/guides/bv103-visual-language.md
 */
const PAGE_OUTER =
  "bv103-stack-page w-full min-h-[40vh] pb-[var(--bv103-space-4)] [-webkit-tap-highlight-color:transparent]";

/** Band L1 — hàng tên/nút, không hộp trắng. Sticky: nền trang mờ, không thẻ nổi. */
const PAGE_CHROME_SHELL = "no-print border-b border-slate-200/80 pb-[var(--bv103-space-2)]";
const PAGE_CHROME_SHELL_STICKY = `${PAGE_CHROME_SHELL} sticky top-0 z-40 bg-[var(--bg-body)]/95 backdrop-blur-sm`;

/** 5 vai trò chữ — không lặp text-sm / font-semibold ở token. */
const TYPE_TITLE = "bv103-type-title";
const TYPE_SECTION = "bv103-type-section";
const TYPE_BODY = "bv103-type-body";
const TYPE_LABEL = "bv103-type-label";
const TYPE_KPI = "bv103-type-kpi";
const TYPE_KPI_LG = "bv103-type-kpi-lg";
const TYPE_NOTE = "bv103-type-note";

export const bv103TypeRole = {
  title: TYPE_TITLE,
  section: TYPE_SECTION,
  body: TYPE_BODY,
  label: TYPE_LABEL,
  kpi: TYPE_KPI,
  kpiLg: TYPE_KPI_LG,
  note: TYPE_NOTE,
} as const;

export const bv103DesignTokens = {
  pageOuter: PAGE_OUTER,
  /** Alias — cùng nhịp `pageOuter` (không nhảy gap khi đổi Analytics). */
  pageOuterAnalytics: PAGE_OUTER,
  pageSectionGap: "bv103-stack-page",

  pageChromeShell: PAGE_CHROME_SHELL,
  pageChromeShellSticky: PAGE_CHROME_SHELL_STICKY,

  /** @deprecated Dùng `pageChromeShellSticky` */
  stickyAnalyticsShell: PAGE_CHROME_SHELL_STICKY,
  /** @deprecated Dùng `pageChromeShellSticky` */
  analyticsToolbarShell: PAGE_CHROME_SHELL_STICKY,
  /** @deprecated Dùng `pageChromeShell` */
  analyticsToolbarShellStatic: PAGE_CHROME_SHELL,

  /** H1 trong chrome — compact (App Header đã có tên trang) */
  pageTitle: TYPE_TITLE,
  pageSubtitle: `mt-[var(--bv103-space-2)] max-w-2xl ${TYPE_LABEL} font-normal`,
  /** Dòng phụ list/toolbar (danh mục, breadcrumb nội dung) */
  pageEyebrow: TYPE_LABEL,
  /** @deprecated Dùng `pageChromeShell` + KsnkPageChrome */
  pageToolbar: PAGE_CHROME_SHELL,

  /** App chrome: sidebar group + zone trên Header — IN HOA duy nhất ở lớp điều hướng */
  navGroupLabel: `${TYPE_LABEL} font-semibold uppercase tracking-wider text-slate-400`,
  shellZone: `${TYPE_LABEL} font-semibold uppercase tracking-wider text-slate-400`,
  /** Tên module duy nhất trên App Header — primary green */
  shellPage: `truncate ${TYPE_SECTION} leading-snug text-[var(--primary)]`,

  sectionTitle: TYPE_SECTION,
  labelBlock: TYPE_LABEL,
  labelBlockMuted: `${TYPE_LABEL} text-slate-400`,
  tableHeader: TYPE_LABEL,
  /** Ô bảng — dùng qua *-table-chrome / *-ui-chrome, không inline */
  tableCellCode: `font-mono ${TYPE_LABEL} text-[var(--primary)]`,
  tableCellTitle: `${TYPE_SECTION} leading-snug`,
  tableCellBody: `${TYPE_BODY} leading-relaxed text-slate-700`,
  tableCellNote: TYPE_NOTE,
  tableCellIndex: `${TYPE_LABEL} text-slate-400`,
  tableCellMeta: TYPE_LABEL,
  metaMono: `font-mono ${TYPE_LABEL} text-slate-400`,
  statValue: TYPE_KPI,
  statValueLg: TYPE_KPI_LG,
  statValueXl: TYPE_KPI_LG,

  /** Auth / tài khoản — title case slate */
  authBrand: TYPE_TITLE,
  authTitle: TYPE_TITLE,
  authSubtitle: `${TYPE_BODY} font-normal text-slate-600`,
  authLabel: `mb-2 block ${TYPE_BODY} text-slate-700`,
  authInput:
    "w-full rounded-[var(--radius-control)] border border-slate-200 px-4 py-3 bv103-type-body text-slate-800 outline-none transition-[box-shadow,border-color] focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15",

  /** @deprecated Dùng `navGroupLabel` — alias tương thích */
  eyebrow: `${TYPE_LABEL} font-semibold uppercase tracking-wider text-slate-400`,

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

export const BV103_MIN_LABEL_CLASS = "bv103-type-label" as const;
