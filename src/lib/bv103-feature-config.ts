/**
 * Cấu hình tính năng BV103 (configuration-driven) — bật/tắt không cần đổi code module.
 */

import {
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import {
  isPilotFourModulesScopeEnabled,
  isPathBlockedUnderPilotFourModules,
} from "@/lib/ksnk-pilot-four-modules-scope";

export { isPathBlockedUnderPilotFourModules };

/** Pilot 4 module — re-export để UI/docs dùng một import. */

/** TanStack Query staleTime dashboard (ms). */
export function dashboardQueryStaleTimeMs(): number {
  const raw = Number(process.env.BV103_DASHBOARD_QUERY_STALE_MS ?? "90000");
  return Number.isFinite(raw) && raw >= 0 ? raw : 90_000;
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
  if (isPilotCoreModulesScopeEnabled()) {
    if (moduleKey === "QLCV") return true;
    return false;
  }
  if (isPilotFourModulesScopeEnabled()) {
    return false;
  }
  return true;
}

export function isPilotScopeActive(): boolean {
  return isPilotCoreModulesScopeEnabled() || isPilotFourModulesScopeEnabled();
}

/** Bật/tắt Digital BOM Checklist tại trạm Đóng gói. */
export function isBOMChecklistEnabled(): boolean {
  return process.env.BV103_FEATURE_BOM_CHECKLIST !== "0";
}

