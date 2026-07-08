import { verifyAnyPermission, verifyPermission } from "@/lib/server-permission";
import { DASHBOARD_CC_WIDGET } from "@/lib/dashboard-command-center-widget-keys";

/** Một trong các widget CC hoặc quyền `DASHBOARD` legacy (tương thích ngược). */
const CC_OR_LEGACY_VIEW = [
  { moduleKey: "DASHBOARD", action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.SUPERVISION, action: "view" },
  { moduleKey: DASHBOARD_CC_WIDGET.GAP, action: "view" },
] as const;

const SUPERVISION_VIEW = [
  { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
  { moduleKey: "GIAM_SAT_VST", action: "view" },
  { moduleKey: "GIAM_SAT_NKBV", action: "view" },
] as const;

export type AnalyticsShellContext = "command-center" | "vst" | "gsc";

/** Vào Command Center / báo cáo tổng hợp: widget CC (hoặc DASHBOARD cũ) + ít nhất một nguồn giám sát. */
export async function verifyCommandCenterShell() {
  await verifyAnyPermission([...CC_OR_LEGACY_VIEW]);
  await verifyAnyPermission([...SUPERVISION_VIEW]);
}

/** Tab Thống kê VST/GSC — chỉ cần quyền module tương ứng (khớp NAV_GATE_VST / NAV_GATE_GSC). */
async function verifyAnalyticsModuleShell(module: "vst" | "gsc") {
  const key = module === "vst" ? "GIAM_SAT_VST" : "GIAM_SAT_CHUNG";
  await verifyPermission(key, "view");
}

export async function verifyAnalyticsShell(context: AnalyticsShellContext) {
  if (context === "command-center") {
    await verifyCommandCenterShell();
    return;
  }
  await verifyAnalyticsModuleShell(context);
}

export async function verifyDashboardOverviewWidget() {
  await verifyAnyPermission([
    { moduleKey: "DASHBOARD", action: "view" },
    { moduleKey: DASHBOARD_CC_WIDGET.OVERVIEW, action: "view" },
  ]);
}

/** Báo cáo tổng hợp — cùng policy shell với Command Center. */
export async function verifyBaoCaoTongHopShell() {
  await verifyCommandCenterShell();
}
