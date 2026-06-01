import { verifyAnyPermission } from "@/lib/server-permission";
import { DASHBOARD_CC_WIDGET } from "@/lib/dashboard-command-center-widget-keys";

/** Một trong các widget CC hoặc quyền `DASHBOARD` legacy (tương thích ngược). */
const CC_OR_LEGACY_VIEW = [
  { moduleKey: "DASHBOARD", action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.SUPERVISION, action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.GAP, action: "view" },
] as const;

/** Vào Command Center: ít nhất một widget (hoặc DASHBOARD cũ) + ít nhất một nguồn giám sát để dữ liệu có nghĩa. */
export async function verifyCommandCenterShell() {
  await verifyAnyPermission([...CC_OR_LEGACY_VIEW]);
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
    { moduleKey: "GIAM_SAT_VST", action: "view" },
  ]);
}

export async function verifyDashboardOverviewWidget() {
  await verifyAnyPermission([
    { moduleKey: "DASHBOARD", action: "view" },
    { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  ]);
}
