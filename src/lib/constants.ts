/**
 * ADM-05: danh sách email quyền khẩn cấp không còn viết cứng.
 * Dùng `KSNK_BREAK_GLASS_EMAILS` (server) qua `isTrustedAdminEmail`.
 * Giữ export rỗng để không phá import cũ; không thêm email thật vào đây.
 */
export const ADMIN_EMAILS: readonly string[] = [];
