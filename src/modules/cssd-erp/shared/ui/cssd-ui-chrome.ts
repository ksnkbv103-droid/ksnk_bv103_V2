/**
 * SSOT UI tokens cho CSSD pages/components.
 * Extends `bv103LayoutChrome` — emerald accent = `--primary` variant.
 */
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103PanelChrome as P } from "@/lib/bv103-panel-chrome";

const touch = "touch-manipulation active:scale-[0.98]";

export const CSSD_UI_PANEL = P.shell;
export const CSSD_UI_PANEL_CHROME = P;
export const CSSD_UI_PANEL_INNER = "rounded-[var(--radius-shell)] border border-slate-200 bg-white";
export const CSSD_UI_SECTION_TITLE = T.sectionTitle;
export const CSSD_UI_PANEL_TITLE = T.pageTitle;
export const CSSD_UI_STEP_HINT = T.pageEyebrow;
export const CSSD_UI_FORM_LABEL = `block ${bv103LayoutChrome.labelField}`;
export const CSSD_UI_STAT_LABEL = T.labelBlock;
export const CSSD_UI_STAT_VALUE = T.statValue;
export const CSSD_UI_TABLE_HEADER = T.tableHeader;
export const CSSD_UI_CELL_CODE = T.tableCellCode;
export const CSSD_UI_CELL_TITLE = T.tableCellTitle;
export const CSSD_UI_CELL_BODY = T.tableCellBody;
export const CSSD_UI_CELL_NOTE = T.tableCellNote;
export const CSSD_UI_CELL_INDEX = T.tableCellIndex;
export const CSSD_UI_CELL_META = T.tableCellMeta;
export const CSSD_UI_CONTROL = bv103LayoutChrome.controlInput;
export const CSSD_UI_CONTROL_NATIVE = bv103LayoutChrome.controlSelectNative;
export const CSSD_UI_DATA_SURFACE =
  "min-h-[280px] overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white p-1.5 shadow-sm sm:min-h-[420px] sm:p-2";
export const CSSD_UI_TAB_GROUP =
  "flex w-full max-w-full gap-1 overflow-x-auto scrollbar-hide rounded-[var(--radius-control)] border border-slate-200 bg-slate-100 p-0.5 sm:w-fit sm:gap-2 sm:p-1";
export const CSSD_UI_TAB_BTN =
  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide transition-all touch-manipulation sm:rounded-xl sm:gap-2 sm:px-5 sm:py-3 sm:text-[11px]";
export const CSSD_UI_TAB_ACTIVE = "bg-[var(--primary)] text-white shadow-sm";
export const CSSD_UI_TAB_IDLE = "text-slate-500 hover:bg-white/70";
export const CSSD_UI_ACTION_PRIMARY = `${bv103LayoutChrome.btnPrimary} shadow-sm ${touch}`;
export const CSSD_UI_ACTION_SECONDARY = `${bv103LayoutChrome.btnSecondary} shadow-sm ${touch}`;
