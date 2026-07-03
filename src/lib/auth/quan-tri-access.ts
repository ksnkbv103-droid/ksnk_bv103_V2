"use server";

import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
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

/** Hub Quản trị — OR DANH_MUC / PHAN_QUYEN / NHAN_SU view hoặc ADMIN. */
export async function canAccessQuanTriHub(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return (
    snap.isAdmin ||
    snap.canView("DANH_MUC") ||
    snap.canView("PHAN_QUYEN") ||
    snap.canView("NHAN_SU")
  );
}

/** Deep link / tab Phân quyền — cần PHAN_QUYEN view hoặc ADMIN. */
export async function canAccessPhanQuyenRoute(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || snap.canView("PHAN_QUYEN");
}

/** Tài khoản nhân sự — khớp UI: PHAN_QUYEN edit hoặc ADMIN. */
export async function canAccessTaiKhoanNhanSuRoute(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || (snap.canView("PHAN_QUYEN") && snap.canEdit("PHAN_QUYEN"));
}

/** Trang danh mục dedicated — cần view module tương ứng hoặc DANH_MUC view hoặc ADMIN. */
export async function canAccessDanhMucModuleRoute(moduleKey: string): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || snap.canView(moduleKey) || snap.canView("DANH_MUC");
}
