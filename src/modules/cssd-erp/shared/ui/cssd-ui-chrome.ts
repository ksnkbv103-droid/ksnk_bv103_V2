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
export const CSSD_UI_SECTION_TITLE = T.sectionTitle;
export const CSSD_UI_PANEL_TITLE = T.pageTitle;
export const CSSD_UI_STEP_HINT = T.pageEyebrow;
export const CSSD_UI_FORM_LABEL = `block ${bv103LayoutChrome.labelField}`;
export const CSSD_UI_STAT_LABEL = T.labelBlock;
export const CSSD_UI_STAT_VALUE = T.statValue;
export const CSSD_UI_TABLE_HEADER = T.tableHeader;
export const CSSD_UI_CELL_CODE = T.tableCellCode;
export const CSSD_UI_CELL_INDEX = T.tableCellIndex;
export const CSSD_UI_CELL_META = T.tableCellMeta;
export const CSSD_UI_CONTROL = bv103LayoutChrome.controlInput;
export const CSSD_UI_CONTROL_NATIVE = bv103LayoutChrome.controlSelectNative;
export const CSSD_UI_DATA_SURFACE =
  "min-h-[280px] overflow-hidden rounded-[var(--radius-shell)] border border-slate-200 bg-white p-1.5 shadow-sm sm:min-h-[420px] sm:p-2";
/** Alias strip chung — khớp `bv103LayoutChrome.navTabStrip` (Ops dialect). */
export const CSSD_UI_TAB_GROUP = `${bv103LayoutChrome.navTabStrip} sm:w-fit`;
export const CSSD_UI_TAB_BTN = bv103LayoutChrome.navTabBtn;
export const CSSD_UI_TAB_ACTIVE = "bg-[var(--primary)] text-white shadow-sm";
export const CSSD_UI_TAB_IDLE = "bg-transparent text-slate-600 hover:bg-white/80";
export const CSSD_UI_ACTION_PRIMARY = `${bv103LayoutChrome.btnPrimary} ${touch}`;
export const CSSD_UI_ACTION_SECONDARY = `${bv103LayoutChrome.btnSecondary} ${touch}`;
