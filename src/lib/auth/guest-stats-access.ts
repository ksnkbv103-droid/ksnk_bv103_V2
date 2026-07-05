/** Vai trò khách — chỉ xem Thống kê VST/GSC. */

export const GUEST_STATS_ROLE = "KHACH_THONG_KE_GSTT" as const;

export const GUEST_STATS_HOME_PATH = "/thong-ke/vst" as const;

const GUEST_ALLOWED_EXACT = new Set(["/thong-ke", GUEST_STATS_HOME_PATH, "/thong-ke/gsc"]);

export function isGuestStatsOnlyRole(roles: readonly string[]): boolean {
  return roles.map((r) => String(r || "").trim().toUpperCase()).includes(GUEST_STATS_ROLE);
}

export function isGuestStatsPathAllowed(pathname: string): boolean {
  const p = pathname.trim() || "/";
  if (GUEST_ALLOWED_EXACT.has(p)) return true;
  if (p.startsWith("/thong-ke/vst/") || p.startsWith("/thong-ke/gsc/")) return true;
  if (p === "/login" || p.startsWith("/login/")) return true;
  return false;
}

export function resolvePostLoginPath(
  roles: readonly string[],
  canSeeCommandCenter: boolean,
): string {
  if (isGuestStatsOnlyRole(roles)) return GUEST_STATS_HOME_PATH;
  if (!canSeeCommandCenter) return "/giam-sat";
  return "/";
}
