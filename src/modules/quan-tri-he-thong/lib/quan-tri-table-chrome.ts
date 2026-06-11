/**
 * SSOT bảng MDM / Quản trị — typography, toolbar, ô dữ liệu.
 * Module chỉ import chrome này; không hardcode header IN HOA / weight quá đậm trên nội dung dài.
 * @see docs/reference/guides/bv103-visual-language.md
 */
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { quanTriFormChrome as C } from "./quan-tri-form-chrome";

export const quanTriTableChrome = {
  /** Toolbar trên bảng (export / import / thêm) */
  toolbar: C.pageToolbar,
  toolbarActions: "flex flex-wrap items-center gap-3",
  toolbarTitle: T.sectionTitle,

  /** Header cột — chữ thường; nguồn `header` trong Column cũng viết title case */
  columnHeader: T.tableHeader,

  /** Ô dữ liệu */
  cellCode: T.tableCellCode,
  cellTitle: T.tableCellTitle,
  cellBody: T.tableCellBody,
  cellNote: T.tableCellNote,
  cellIndex: T.tableCellIndex,
  cellMeta: T.tableCellMeta,

  /** Nút toolbar — dùng chung quanTriFormChrome (title case, không uppercase CSS) */
  ctaPrimary: C.ctaPrimary,
  ctaSecondary: C.ctaSecondary,
  ctaImport: C.ctaAmber,
  ctaExport: C.ctaMuted,
} as const;

/** Header cột chuẩn Quản trị — title case trong source */
export const quanTriTableHeaders = {
  codeAndName: "Mã / Tên",
  status: "Trạng thái",
  manage: "Quản lý",
  stt: "STT",
  criteriaContent: "Nội dung tiêu chí",
} as const;
