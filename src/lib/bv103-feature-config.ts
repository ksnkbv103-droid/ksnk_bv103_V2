/**
 * Cấu hình tính năng BV103 (configuration-driven) — bật/tắt không cần đổi code module.
 */

import {
  isPilotFourModulesScopeEnabled,
  isPathBlockedUnderPilotFourModules,
} from "@/lib/ksnk-pilot-four-modules-scope";

/** Pilot 4 module — re-export để UI/docs dùng một import. */
export { isPilotFourModulesScopeEnabled, isPathBlockedUnderPilotFourModules };

/** RPC GSC multi: v2 = một lần quét sessions (mặc định). Set `BV103_COMPLIANCE_MULTI_V2=0` để v1. */
export function isComplianceDashboardMultiV2Enabled(): boolean {
  return process.env.BV103_COMPLIANCE_MULTI_V2 !== "0";
}

/**
 * @deprecated Tên cũ gây nhầm với React Hook rules — dùng `isComplianceDashboardMultiV2Enabled`.
 */
export function useComplianceDashboardMultiV2(): boolean {
  return isComplianceDashboardMultiV2Enabled();
}

/** TanStack Query staleTime dashboard (ms). */
export function dashboardQueryStaleTimeMs(): number {
  const raw = Number(process.env.BV103_DASHBOARD_QUERY_STALE_MS ?? "90000");
  return Number.isFinite(raw) && raw >= 0 ? raw : 90_000;
}

/** Ghi audit trigger trên fact phiên GS (DB). App chỉ đọc khi cần. */
export function isBv103AuditLogEnabled(): boolean {
  return process.env.BV103_AUDIT_LOG !== "0";
}

/** Module flags bổ sung (ngoài pilot). */
export function isModuleEnabled(moduleKey: "CSSD" | "QLCV" | "NKBV" | "HIS"): boolean {
  const envMap: Record<string, string | undefined> = {
    CSSD: process.env.KSNK_MODULE_CSSD,
    QLCV: process.env.KSNK_MODULE_QLCV,
    NKBV: process.env.KSNK_MODULE_NKBV,
    HIS: process.env.KSNK_MODULE_HIS,
  };
  const v = envMap[moduleKey];
  if (v === "0") return false;
  if (v === "1") return true;
  if (isPilotFourModulesScopeEnabled()) {
    return false;
  }
  return true;
}
