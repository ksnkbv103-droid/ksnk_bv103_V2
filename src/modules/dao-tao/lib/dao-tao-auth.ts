"use server";

import { verifyPermission } from "@/lib/server-permission";
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
