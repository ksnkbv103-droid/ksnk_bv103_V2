/** Chuẩn hóa mã nhân viên / email ô đăng nhập. */

export function normalizeLoginIdentifier(raw: string): string {
  return String(raw ?? "").trim();
}

export function normalizeEmail(raw: string): string {
  return normalizeLoginIdentifier(raw).toLowerCase();
}

export function identifierLooksLikeEmail(id: string): boolean {
  return id.includes("@");
}
