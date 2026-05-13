/**
 * Chuẩn hóa tiền tố mã nghiệp vụ dùng với LIKE / RPC max suffix (chữ số + A–Z, độ dài ngắn).
 */
export function sanitizeBusinessMaPrefix(raw: unknown): string | null {
  const s = String(raw ?? "")
    .replace(/^\ufeff/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toUpperCase();
  if (!s || s.length > 12) return null;
  if (!/^[A-Z0-9]+$/.test(s)) return null;
  return s;
}
