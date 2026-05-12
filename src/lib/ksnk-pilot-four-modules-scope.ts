/**
 * Pilot 4 module (Quản trị, GSC, VST, Dashboard) — chặn route ngoài phạm vi khi bật env.
 * Dev / staging: không set biến → toàn bộ route như cũ. Production pilot: set `KSNK_PILOT_FOUR_MODULES=1`.
 */

const BLOCKED_PREFIXES = ["/cssd-erp", "/quan-ly-cong-viec", "/giam-sat-nkbv"] as const;

function normalizePathname(pathname: string): string {
  const t = pathname.trim();
  if (!t) return "/";
  return t.startsWith("/") ? t : `/${t}`;
}

/** `true` khi deploy chỉ mở 4 module (chặn CSSD, NKBV, Công việc ở tầng proxy). */
export function isPilotFourModulesScopeEnabled(): boolean {
  return process.env.KSNK_PILOT_FOUR_MODULES === "1";
}

export function isPathBlockedUnderPilotFourModules(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return BLOCKED_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
