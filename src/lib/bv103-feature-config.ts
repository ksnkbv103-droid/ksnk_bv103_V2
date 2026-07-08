/**
 * Cấu hình tính năng BV103 (configuration-driven) — bật/tắt không cần đổi code module.
 */

import {
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import {
  isPilotFourModulesScopeEnabled,
} from "@/lib/ksnk-pilot-four-modules-scope";

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

/** @deprecated Digital BOM modal — thay bằng panel đối chiếu + báo sự cố dụng cụ. Chỉ bật khi BV103_FEATURE_BOM_CHECKLIST=1. */
export function isBOMChecklistEnabled(): boolean {
  return process.env.BV103_FEATURE_BOM_CHECKLIST === "1";
}
