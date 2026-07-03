import { ADMIN_EMAILS } from "@/lib/constants";

/** Email break-glass pilot — bypass RBAC app-layer (vẫn cần role ADMIN trên DB cho RLS nếu không dùng service role). */
export function isTrustedAdminEmail(email: string | undefined | null): boolean {
  const e = String(email || "").toLowerCase().trim();
  if (!e) return false;
  return ADMIN_EMAILS.some((a) => a.toLowerCase() === e);
}
