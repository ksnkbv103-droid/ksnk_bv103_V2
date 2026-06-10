/**
 * SSOT UI tokens cho CSSD pages/components.
 * Extends `bv103LayoutChrome` — emerald accent = `--primary` variant.
 */
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

const touch = "touch-manipulation active:scale-[0.98]";

export const CSSD_UI_PANEL = bv103LayoutChrome.panelSurface;
export const CSSD_UI_PANEL_INNER = "rounded-[var(--radius-shell)] border border-slate-200 bg-white";
export const CSSD_UI_SECTION_TITLE = T.sectionTitle;
export const CSSD_UI_PANEL_TITLE = T.pageTitle;
export const CSSD_UI_STEP_HINT = T.pageEyebrow;
export const CSSD_UI_FORM_LABEL = `block ${bv103LayoutChrome.labelField}`;
export const CSSD_UI_STAT_LABEL = T.labelBlock;
export const CSSD_UI_STAT_VALUE = T.statValue;
export const CSSD_UI_TABLE_HEADER = T.tableHeader;
export const CSSD_UI_CONTROL = bv103LayoutChrome.controlInput;
export const CSSD_UI_CONTROL_NATIVE = bv103LayoutChrome.controlSelectNative;
export const CSSD_UI_DATA_SURFACE =
  "min-h-[420px] overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white p-2 shadow-sm";
export const CSSD_UI_TAB_GROUP = "flex w-fit gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-slate-100 p-1";
export const CSSD_UI_TAB_ACTIVE = "bg-[var(--primary)] text-white shadow-sm";
export const CSSD_UI_TAB_IDLE = "text-slate-500 hover:bg-white/70";
export const CSSD_UI_ACTION_PRIMARY = `${bv103LayoutChrome.btnPrimary} shadow-sm ${touch}`;
export const CSSD_UI_ACTION_SECONDARY = `${bv103LayoutChrome.btnSecondary} shadow-sm ${touch}`;
