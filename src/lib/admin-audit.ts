import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getRequestAuthUser } from "@/lib/auth/rbac-request";
import { normalizeEmail } from "@/lib/auth/normalize-login-identifier";

export type AdminAuditAction =
  | "CHANGE_LOGIN_EMAIL"
  | "CHANGE_RBAC_ROLE"
  | "CHANGE_RBAC_MATRIX"
  | "LOCK_UNLOCK_ACCOUNT"
  | "BREAK_GLASS_USED"
  | "APPROVE_ACCOUNT_REQUEST"
  | "REJECT_ACCOUNT_REQUEST"
  | string;

export type LogAdminActionInput = {
  action: AdminAuditAction;
  targetTable?: string | null;
  targetId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
};

/** Che một phần email trước khi ghi nhật ký. */
export function maskEmailForAudit(emailRaw: string | null | undefined): string {
  const email = normalizeEmail(String(emailRaw || ""));
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const head = local.slice(0, 1) || "*";
  return `${head}***@${domain}`;
}

/**
 * Ghi nhật ký quản trị (insert-only). Dùng service role sau khi action đã kiểm quyền.
 * Bảng `sys_admin_audit` do ADM-02 tạo — thiếu bảng thì bỏ qua (không chặn thao tác).
 */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const user = input.actorUserId
      ? { id: input.actorUserId, email: input.actorEmail }
      : await getRequestAuthUser();
    const actorId = user?.id ? String(user.id) : null;
    if (!actorId) return;

    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("sys_admin_audit").insert({
      actor_user_id: actorId,
      actor_email: maskEmailForAudit(user?.email || input.actorEmail || ""),
      action: String(input.action || "").trim() || "UNKNOWN",
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
      reason: input.reason ?? null,
    });
    if (error) {
      // Bảng chưa migrate / RLS — không phá luồng nghiệp vụ.
      console.warn("[admin-audit] skip:", error.message);
    }
  } catch (e) {
    console.warn("[admin-audit] skip:", e instanceof Error ? e.message : e);
  }
}
