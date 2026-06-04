/**
 * SSOT UI tokens cho CSSD pages/components.
 * Extends `bv103LayoutChrome` — emerald accent = `--primary` variant.
 */
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

export const CSSD_UI_PANEL = bv103LayoutChrome.panelSurface;
export const CSSD_UI_PANEL_INNER = "rounded-xl border border-slate-200 bg-white";
export const CSSD_UI_SECTION_TITLE = "text-[11px] font-semibold uppercase tracking-wider text-slate-500";
export const CSSD_UI_DATA_SURFACE =
  "min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm";
export const CSSD_UI_TAB_GROUP = "flex w-fit gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1";
export const CSSD_UI_TAB_ACTIVE = "bg-[var(--primary)] text-white shadow-sm";
export const CSSD_UI_TAB_IDLE = "text-slate-500 hover:bg-white/70";
export const CSSD_UI_ACTION_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90";
export const CSSD_UI_ACTION_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50";
