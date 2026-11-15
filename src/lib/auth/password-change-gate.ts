/** Cổng ép đổi mật khẩu phía server (proxy.ts) và client — cờ must_change_password trong app_metadata / user_metadata. */

/** Đường dẫn được phép khi tài khoản còn cờ must_change_password. */
export function isPasswordChangeExemptPath(pathname: string): boolean {
  return (
    pathname === "/tai-khoan/doi-mat-khau" ||
    pathname.startsWith("/tai-khoan/doi-mat-khau/") ||
    pathname === "/login" ||
    pathname.startsWith("/login/")
  );
}

function hasMustChangeFlag(meta: unknown): boolean {
  return !!meta && typeof meta === "object" && (meta as Record<string, unknown>).must_change_password === true;
}

export function metaMustChangePassword(userMeta: unknown, appMeta?: unknown): boolean {
  return hasMustChangeFlag(appMeta) || hasMustChangeFlag(userMeta);
}
