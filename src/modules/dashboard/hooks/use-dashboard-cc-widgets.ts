"use client";

import { usePermission } from "@/hooks/usePermission";
import { DASHBOARD_CC_WIDGET } from "@/lib/dashboard-command-center-widget-keys";

/** Quyền widget Command Center — tách ma trận RBAC theo vùng UI. */
export function useDashboardCommandCenterWidgets() {
  const { loading, isAdmin, can } = usePermission(undefined, "view");

  const relax = loading;
  const legacyDashboard = can("DASHBOARD", "view");
  const overview = relax || isAdmin || legacyDashboard || can(DASHBOARD_CC_WIDGET.OVERVIEW, "view");
  const supervision = relax || isAdmin || legacyDashboard || can(DASHBOARD_CC_WIDGET.SUPERVISION, "view");
  const gap = relax || isAdmin || legacyDashboard || can(DASHBOARD_CC_WIDGET.GAP, "view");
  const exportPdf = relax || isAdmin || legacyDashboard || can(DASHBOARD_CC_WIDGET.EXPORT, "export");

  return { loading, overview, supervision, gap, exportPdf };
}
