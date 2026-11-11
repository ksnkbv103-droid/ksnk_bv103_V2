"use server";

import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import { QUAN_TRI_ENTRY_MODULE_KEYS, TO_CHUC_MODULE_KEYS } from "@/lib/nav/ksnk-nav-gates";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";

type AccessSnapshot = {
  isAdmin: boolean;
  canView: (moduleKey: string) => boolean;
  canEdit: (moduleKey: string) => boolean;
};

async function getServerAccessSnapshot(): Promise<AccessSnapshot | null> {
  const userSb = await createServerSupabaseUserClient();
  const {
    data: { user },
  } = await userSb.auth.getUser();
  if (!user?.id) return null;

  if (isTrustedAdminEmail(user.email)) {
    const { logAdminAction } = await import("@/lib/admin-audit");
    void logAdminAction({
      action: "BREAK_GLASS_USED",
      targetTable: "rbac",
      targetId: user.id,
      actorUserId: user.id,
      actorEmail: user.email,
      reason: "quan_tri_access",
    });
    return {
      isAdmin: true,
      canView: () => true,
      canEdit: () => true,
    };
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("v_sys_user_permissions")
    .select("roles, permissions")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  const roles = ((data?.roles as string[]) || []).slice();
  const permissions = ((data?.permissions as { module: string; action: string }[]) || []).slice();
  const isAdmin = roles.includes("ADMIN");

  const has = (moduleKey: string, action: string) =>
    permissions.some((p) => p.module === moduleKey && p.action === action);

  return {
    isAdmin,
    canView: (moduleKey) => isAdmin || has(moduleKey, "view"),
    canEdit: (moduleKey) => isAdmin || has(moduleKey, "edit"),
  };
}

/** Hub Quản trị — cùng tập mã với menu (`QUAN_TRI_ENTRY_MODULE_KEYS`). */
export async function canAccessQuanTriHub(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  if (snap.isAdmin) return true;
  return QUAN_TRI_ENTRY_MODULE_KEYS.some((key) => snap.canView(key));
}

/** Module Tổ chức (AR-8e) — ADMIN hoặc xem một trong KHOA_PHONG / NHAN_SU / DANH_MUC_ORG. */
export async function canAccessToChucModule(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  if (snap.isAdmin) return true;
  return TO_CHUC_MODULE_KEYS.some((key) => snap.canView(key));
}

/** Quyền xem từng thẻ trong hub Tổ chức (server). */
export async function getToChucViewFlags(): Promise<Record<(typeof TO_CHUC_MODULE_KEYS)[number], boolean>> {
  const snap = await getServerAccessSnapshot();
  const v = (k: string) => Boolean(snap && (snap.isAdmin || snap.canView(k)));
  return { KHOA_PHONG: v("KHOA_PHONG"), NHAN_SU: v("NHAN_SU"), DANH_MUC_ORG: v("DANH_MUC_ORG") };
}

/** Deep link / tab Phân quyền — ADM-03: ma trận RBAC chỉ dành riêng cho ADMIN. */
export async function canAccessPhanQuyenRoute(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin;
}

/** Tài khoản & truy cập (hub + legacy redirect) — khớp UI: PHAN_QUYEN edit hoặc ADMIN. */
export async function canAccessTaiKhoanNhanSuRoute(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || (snap.canView("PHAN_QUYEN") && snap.canEdit("PHAN_QUYEN"));
}

/** Trang danh mục: ADMIN hoặc quyền xem module sở hữu (AR-8h: bỏ fallback DANH_MUC). */
export async function canAccessDanhMucModuleRoute(moduleKey: string): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || snap.canView(moduleKey);
}
