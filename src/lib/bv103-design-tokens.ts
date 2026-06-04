/**
 * SSOT design tokens BV103 — spacing, typography, page rhythm.
 * Compose với `bv103LayoutChrome` (surface/panel) và primitives React (`KsnkPageShell`, `KsnkSupervisionHero`).
 * @see docs/modules/giam-sat/layout-primitives.md
 */

/** Nhịp trang trong `KsnkPageShell` (không lặp max-width — shell đã `max-w-7xl`). */
export const bv103DesignTokens = {
  pageOuter: "w-full min-h-[40vh] space-y-6 pb-12 touch-manipulation [-webkit-tap-highlight-color:transparent]",
  pageOuterAnalytics: "w-full space-y-8 pb-24",
  pageSectionGap: "space-y-8",

  /** Sticky filter + hero (dashboard / báo cáo) */
  stickyAnalyticsShell:
    "no-print sticky top-4 z-40 rounded-2xl border border-slate-200/90 bg-white/95 p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] backdrop-blur-md md:p-6",

  eyebrow: "text-[11px] font-semibold uppercase tracking-wider text-slate-400",
  pageTitle: "text-xl font-semibold tracking-tight text-slate-900 md:text-2xl",
  pageSubtitle: "mt-2 max-w-2xl text-sm leading-relaxed text-slate-600",
  sectionTitle: "text-sm font-semibold text-slate-800",
  labelBlock: "text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  labelBlockMuted: "text-[11px] font-medium uppercase tracking-wide text-slate-400",
  tableHeader: "text-[11px] font-semibold uppercase tracking-wider text-slate-500",
  metaMono: "text-[11px] font-mono font-medium text-slate-400",

  btnPrimary:
    "inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50",
  btnSecondary:
    "inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50",
  btnGhostDark:
    "inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800",

  skeletonBlock: "animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80",
} as const;

/** Cỡ chữ tối thiểu cho label UI (cấm `text-[11px]` / `text-[11px]` ở code mới). */
export const BV103_MIN_LABEL_CLASS = "text-[11px]" as const;
