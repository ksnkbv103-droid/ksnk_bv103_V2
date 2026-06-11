/** SSOT bảng QLCV — compose từ design tokens. */
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export const qlcvTableChrome = {
  tableHeader: T.tableHeader,
  cellTitle: T.tableCellTitle,
  cellBody: T.tableCellBody,
  cellMeta: T.tableCellMeta,
  cellCode: T.tableCellCode,
  ctaPrimary: C.btnPrimary,
  ctaSecondary: C.btnSecondary,
} as const;
