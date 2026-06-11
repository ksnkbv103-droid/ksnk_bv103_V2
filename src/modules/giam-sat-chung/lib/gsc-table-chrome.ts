/** SSOT bảng / lịch sử GSC — compose từ design tokens. */
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export const gscTableChrome = {
  tableHeader: T.tableHeader,
  cellCode: T.tableCellCode,
  cellTitle: T.tableCellTitle,
  cellBody: T.tableCellBody,
  cellNote: T.tableCellNote,
  cellIndex: T.tableCellIndex,
  cellMeta: T.tableCellMeta,
  panel: C.panelSurface,
  ctaPrimary: C.btnPrimary,
  ctaSecondary: C.btnSecondary,
} as const;
