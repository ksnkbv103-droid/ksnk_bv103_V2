import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { getActorRoleNames } from "@/lib/server-permission";

export const SELF_APPROVAL_FORBIDDEN =
  "Không được tự duyệt phiếu do chính mình đề nghị — nhờ người khác có quyền duyệt.";
export const APPROVER_UNMAPPED =
  "Tài khoản duyệt chưa gắn hồ sơ nhân sự — không ghi được người duyệt. Liên hệ quản trị gắn nhân sự trước khi duyệt.";

export type ApproverIdentity = { authUserId: string; nhanSuId: string | null; isAdmin: boolean };

/**
 * Chặn tự duyệt (thuần) — lát KD-1 (C3/TB7).
 * - Người duyệt map được nhân sự: trùng người đề nghị (theo nhân sự hoặc tài khoản) → chặn, kể cả ADMIN.
 * - Không map được nhân sự: chỉ ADMIN (break-glass) được duyệt, người duyệt để trống; vai trò khác → từ chối.
 */
export function checkCatalogApprover(
  approver: ApproverIdentity,
  requester: { nhanSuId?: string | null; authUserId?: string | null },
): { ok: true; approvedById: string | null } | { ok: false; error: string } {
  const apNs = String(approver.nhanSuId || "").trim();
  const apAuth = String(approver.authUserId || "").trim();
  const rqNs = String(requester.nhanSuId || "").trim();
  const rqAuth = String(requester.authUserId || "").trim();
  if ((apNs && rqNs && apNs === rqNs) || (apAuth && rqAuth && apAuth === rqAuth)) {
    return { ok: false, error: SELF_APPROVAL_FORBIDDEN };
  }
  if (!apNs) {
    if (!approver.isAdmin) return { ok: false, error: APPROVER_UNMAPPED };
    return { ok: true, approvedById: null };
  }
  return { ok: true, approvedById: apNs };
}

/** Đọc danh tính người duyệt hiện tại; lỗi đọc → ném (không nuốt). */
export async function resolveCatalogApprover(admin: SupabaseClient): Promise<ApproverIdentity> {
  const uc = await createServerSupabaseUserClient();
  const { data: auth, error: authErr } = await uc.auth.getUser();
  if (authErr) throw new Error(authErr.message);
  const authUserId = String(auth.user?.id || "").trim();
  if (!authUserId) throw new Error("Phiên đăng nhập không hợp lệ.");
  const [{ data: ns, error: nsErr }, roles] = await Promise.all([
    admin.from("mdm_nhan_su").select("id").eq("auth_user_id", authUserId).limit(2),
    getActorRoleNames(),
  ]);
  if (nsErr) throw new Error(nsErr.message);
  if ((ns || []).length > 1) throw new Error("Tài khoản gắn hơn một hồ sơ nhân sự — không xác định được người duyệt.");
  return {
    authUserId,
    nhanSuId: ns?.[0]?.id ? String(ns[0].id) : null,
    isAdmin: roles.includes("ADMIN"),
  };
}
