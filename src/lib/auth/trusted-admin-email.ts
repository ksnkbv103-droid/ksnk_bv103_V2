/**
 * Email quyền khẩn cấp (break-glass) — chỉ đọc từ biến môi trường server.
 * `KSNK_BREAK_GLASS_EMAILS` = danh sách phân cách dấu phẩy (so khớp lower-case).
 * Không đặt biến = tắt hẳn nhánh khẩn cấp (ADMIN qua vai trò vẫn đủ).
 */

function parseBreakGlassEmailsFromEnv(): string[] {
  const raw = String(process.env.KSNK_BREAK_GLASS_EMAILS || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

/** Danh sách email khẩn cấp (server-only). Không dùng trên client bundle. */
export function getBreakGlassEmails(): string[] {
  return parseBreakGlassEmailsFromEnv();
}

/** Email break-glass — bypass RBAC app-layer khi có trong env. */
export function isTrustedAdminEmail(email: string | undefined | null): boolean {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  const list = parseBreakGlassEmailsFromEnv();
  if (!list.length) return false;
  return list.includes(e);
}

/** Gắn vai trò ADMIN khi email khớp env (env trống = không đổi). */
export function withBreakGlassAdminRole(
  roles: readonly string[],
  email: string | undefined | null,
): string[] {
  const next = roles.slice();
  if (isTrustedAdminEmail(email) && !next.includes("ADMIN")) {
    next.push("ADMIN");
  }
  return next;
}
