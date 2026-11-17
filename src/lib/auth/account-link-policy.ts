/**
 * QT-003: chính sách tự gắn tài khoản Auth vào hồ sơ mdm_nhan_su theo email.
 * Khách tự đăng ký (email tự xác nhận) KHÔNG được tự gắn hồ sơ nhân sự; chỉ khi ADMIN đã
 * duyệt/cấp tài khoản — đánh dấu bằng `app_metadata.admin_provisioned === true`
 * (app_metadata chỉ ghi được bằng service-role, client signUp không đặt được).
 * Tài khoản ADMIN cấp qua màn Tài khoản KSNK đã được gắn auth_user_id ngay lúc tạo.
 */
export type AccountLinkPolicyUser = {
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, unknown> | null;
};

export function canSelfLinkByEmail(user: AccountLinkPolicyUser | null | undefined): boolean {
  if (!user?.email_confirmed_at) return false;
  return user.app_metadata?.admin_provisioned === true;
}

export const PENDING_ADMIN_APPROVAL_MESSAGE =
  "Tài khoản đang chờ ADMIN duyệt — liên hệ quản trị để liên kết hồ sơ nhân sự.";
