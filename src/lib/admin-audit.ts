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
  /** true: ghi nhật ký lỗi / thiếu actor thì NÉM lỗi (dùng cho thay đổi quyền). Mặc định false (best-effort). */
  failClosed?: boolean;
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

const THROTTLED_ACTIONS = new Set(["BREAK_GLASS_USED"]);
const lastLoggedByActionUser = new Map<string, number>();
export const AUDIT_THROTTLE_WINDOW_MS = 60_000;

export function clearAuditThrottleCacheForTesting(): void {
  lastLoggedByActionUser.clear();
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
    if (!actorId) {
      if (input.failClosed) throw new Error("Không xác định người thực hiện để ghi nhật ký quản trị.");
      return;
    }

    const action = String(input.action || "").trim() || "UNKNOWN";
    if (THROTTLED_ACTIONS.has(action)) {
      const throttleKey = `${actorId}:${action}:${input.reason || ""}`;
      const now = Date.now();
      const last = lastLoggedByActionUser.get(throttleKey) || 0;
      if (now - last < AUDIT_THROTTLE_WINDOW_MS) {
        return;
      }
      lastLoggedByActionUser.set(throttleKey, now);
    }

    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("sys_admin_audit").insert({
      actor_user_id: actorId,
      actor_email: maskEmailForAudit(user?.email || input.actorEmail || ""),
      action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      before_data: input.before ?? null,
      after_data: input.after ?? null,
      reason: input.reason ?? null,
    });
    if (error) {
      if (input.failClosed) throw new Error(`Ghi nhật ký quản trị thất bại: ${error.message}`);
      // Bảng chưa migrate / RLS — không phá luồng nghiệp vụ.
      console.warn("[admin-audit] skip:", error.message);
    }
  } catch (e) {
    if (input.failClosed) throw e instanceof Error ? e : new Error(String(e));
    console.warn("[admin-audit] skip:", e instanceof Error ? e.message : e);
  }
}
