/** Mã module RBAC — widget Command Center (`/`). Khớp `MODULE_REGISTRY` + `sys_permissions`. */
export const DASHBOARD_CC_WIDGET = {
  OVERVIEW: "DASHBOARD_CC_OVERVIEW",
  SUPERVISION: "DASHBOARD_CC_SUPERVISION",
  GAP: "DASHBOARD_CC_GAP",
  EXPORT: "DASHBOARD_CC_EXPORT",
} as const;

/** Client RBAC — quyền in/xuất BCTH. */
export function canExportBaoCaoTongHop(canExport: (moduleKey: string) => boolean): boolean {
  return canExport(DASHBOARD_CC_WIDGET.EXPORT);
}
