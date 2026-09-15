/**
 * Quyền đọc catalog kho CSSD (OR theo thứ tự).
 * Chỉ CSSD_KHO_DUNGCU — không soft-OR CSSD_WORKFLOW.view (tránh rò master khi chỉ quét QR).
 * Khớp NAV_GATE_CSSD_DUNG_CU.
 */
export const CSSD_KHO_CATALOG_PERMISSION_CANDIDATES: ReadonlyArray<readonly [string, string]> = [
  ["CSSD_KHO_DUNGCU", "view"],
  ["CSSD_KHO_DUNGCU", "edit"],
  ["CSSD_KHO_DUNGCU", "create"],
  ["CSSD_KHO_DUNGCU", "import"],
] as const;
