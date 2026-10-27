"use server";

import { verifyAnyPermission, verifyPermission } from "@/lib/server-permission";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";

export async function requireDaoTaoUser() {
  const sb = await createServerSupabaseUserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) throw new Error("Bạn chưa đăng nhập.");
  await verifyPermission("DAO_TAO", "view");
  return { sb, user };
}

/**
 * Quyền quản trị Thi KSNK — khớp `DaoTaoAdminAccessGate`: ADMIN, hoặc DAO_TAO view
 * kèm ít nhất một trong edit / import / create. Dùng cho ngân hàng đề, xuất, kết quả, thống kê.
 */
export async function requireDaoTaoAdmin() {
  const ctx = await requireDaoTaoUser();
  try {
    await verifyAnyPermission([
      { moduleKey: "DAO_TAO", action: "edit" },
      { moduleKey: "DAO_TAO", action: "import" },
      { moduleKey: "DAO_TAO", action: "create" },
    ]);
  } catch {
    throw new Error("Bạn không có quyền quản trị Thi KSNK.");
  }
  return ctx;
}
