/**
 * Một nguồn phạm vi pilot (core / four-modules) — proxy, sidebar, hub, redirect `/`.
 * Không set env → toàn module (prod hiện tại).
 */

import {
  isNavHiddenUnderPilotCoreModules,
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import {
  isPathBlockedUnderPilotFourModules,
  isPilotFourModulesScopeEnabled,
} from "@/lib/ksnk-pilot-four-modules-scope";

export function isAnyPilotScopeEnabled(): boolean {
  return isPilotCoreModulesScopeEnabled() || isPilotFourModulesScopeEnabled();
}

/** Path bị chặn dưới cờ pilot đang active (core ưu tiên hơn four). */
export function isPathBlockedUnderActivePilot(pathname: string): boolean {
  if (isPilotCoreModulesScopeEnabled()) {
    return isPathBlockedUnderPilotCoreModules(pathname);
  }
  if (isPilotFourModulesScopeEnabled()) {
    return isPathBlockedUnderPilotFourModules(pathname);
  }
  return false;
}

export function isRouteInPilotScope(pathname: string): boolean {
  return !isPathBlockedUnderActivePilot(pathname);
}

/**
 * Ẩn mục sidebar theo gate.id khi pilot bật.
 * Four-modules: ẩn Công việc / NKBV / Đào tạo (route bị proxy chặn); CSSD vẫn hiện.
 */
export function isNavHiddenUnderActivePilot(navGateId: string): boolean {
  if (isPilotCoreModulesScopeEnabled()) {
    return isNavHiddenUnderPilotCoreModules(navGateId);
  }
  if (isPilotFourModulesScopeEnabled()) {
    // Four chặn /quan-ly-cong-viec · /giam-sat-nkbv · /dao-tao; menu ẩn đúng 3 gate đó (id ở ksnk-nav-gates.ts).
    return navGateId === "cv" || navGateId === "nkbv" || navGateId === "dao-tao";
  }
  return false;
}

/** Đích an toàn sau `/` hoặc đăng nhập — không trỏ route bị pilot 404. */
export function resolvePilotSafeEntryPath(): string {
  const candidates = [
    "/bao-cao-tong-hop",
    "/giam-sat",
    "/quan-ly-cong-viec",
    "/quan-tri-he-thong",
  ];
  for (const path of candidates) {
    if (isRouteInPilotScope(path)) return path;
  }
  return "/giam-sat";
}
