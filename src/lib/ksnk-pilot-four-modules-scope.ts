/**
 * Bản thử đầu (PO 2026-11-17): hiện VST/GSC, thống kê, Quản trị, CSSD; ẩn NKBV, Công việc, Đào tạo
 * (chưa có đầu mối) — ẩn = proxy 404 route + ẩn menu, không xóa mã/dữ liệu.
 * Dev / staging: không set biến → toàn bộ route như cũ. Production pilot: set `KSNK_PILOT_FOUR_MODULES=1`.
 */

const BLOCKED_PREFIXES = ["/quan-ly-cong-viec", "/giam-sat-nkbv", "/dao-tao"] as const;

function normalizePathname(pathname: string): string {
  const t = pathname.trim();
  if (!t) return "/";
  return t.startsWith("/") ? t : `/${t}`;
}

/** `true` khi deploy ẩn NKBV, Công việc, Đào tạo (chặn ở tầng proxy; CSSD vẫn mở). */
export function isPilotFourModulesScopeEnabled(): boolean {
  return process.env.KSNK_PILOT_FOUR_MODULES === "1";
}

export function isPathBlockedUnderPilotFourModules(pathname: string): boolean {
  const p = normalizePathname(pathname);
  return BLOCKED_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}
