"use server";

import { isTrustedAdminEmail } from "@/lib/auth/trusted-admin-email";
import { QUAN_TRI_ENTRY_MODULE_KEYS } from "@/lib/nav/ksnk-nav-gates";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";

const DEDICATED_NO_DANH_MUC_FALLBACK = new Set([
  "PHAN_QUYEN",
  "NHAN_SU",
  "KHOA_PHONG",
  "BANG_KIEM",
  "BANG_KIEM_DETAIL",
  "LOAI_DC",
  "BO_DC",
  "DC_LE",
  "THIET_BI",
  "HOA_CHAT",
]);

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

/** Deep link / tab Phân quyền — cần PHAN_QUYEN view hoặc ADMIN. */
export async function canAccessPhanQuyenRoute(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || snap.canView("PHAN_QUYEN");
}

/** Tài khoản & truy cập (hub + legacy redirect) — khớp UI: PHAN_QUYEN edit hoặc ADMIN. */
export async function canAccessTaiKhoanNhanSuRoute(): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  return snap.isAdmin || (snap.canView("PHAN_QUYEN") && snap.canEdit("PHAN_QUYEN"));
}

/**
 * Trang danh mục. Mã đã tách (khoa, bảng kiểm, CSSD, nhân sự) không nhận fallback DANH_MUC.
 * Lookup `DANH_MUC_*` vẫn xem được khi có DANH_MUC.view.
 */
export async function canAccessDanhMucModuleRoute(moduleKey: string): Promise<boolean> {
  const snap = await getServerAccessSnapshot();
  if (!snap) return false;
  if (snap.isAdmin || snap.canView(moduleKey)) return true;
  if (DEDICATED_NO_DANH_MUC_FALLBACK.has(moduleKey)) return false;
  if (moduleKey.startsWith("DANH_MUC_")) return snap.canView("DANH_MUC");
  return false;
}
