/**
 * Pilot 3 module gấp: Quản trị + Giám sát (VST/GSC) + QLCV.
 * Dev/staging: không set biến → menu/route đầy đủ.
 * Triển khai: `KSNK_PILOT_CORE_MODULES=1` (ưu tiên hơn pilot-4 nếu cả hai bật).
 */

import { CSSD_APP_SHELL_PREFIXES } from "@/lib/cssd-routes";

const BLOCKED_EXACT = ["/giam-sat-nkbv", "/bao-cao-tong-hop"] as const;

function normalizePathname(pathname: string): string {
  const t = pathname.trim();
  if (!t) return "/";
  return t.startsWith("/") ? t : `/${t}`;
}

export function isPilotCoreModulesScopeEnabled(): boolean {
  return process.env.KSNK_PILOT_CORE_MODULES === "1";
}

export function isPathBlockedUnderPilotCoreModules(pathname: string): boolean {
  const p = normalizePathname(pathname);
  if (BLOCKED_EXACT.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))) {
    return true;
  }
  return CSSD_APP_SHELL_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Ẩn dashboard / báo cáo tổng hợp trên sidebar khi pilot core (route `/` vẫn mở nếu có quyền). */
export function isNavHiddenUnderPilotCoreModules(navGateId: string): boolean {
  return navGateId === "dash" || navGateId === "nkbv" || navGateId.startsWith("cssd-");
}
