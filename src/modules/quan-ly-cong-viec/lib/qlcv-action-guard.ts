"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { assertActorIsKsnkStaffForQlcv, resolveKsnkKhoaId } from "./qlcv-ksnk-server";

type QlcvPermission = "view" | "create" | "edit" | "delete" | "import" | "approve";

/** RBAC module + actor thuộc KSNK (admin bypass). */
export async function ensureQlcvKsnkAccess(action: QlcvPermission = "view") {
  await verifyPermission("CONG_VIEC", action);
  const supabase = createAdminSupabaseClient();
  const ksnkKhoaId = await assertActorIsKsnkStaffForQlcv(supabase);
  return { supabase, ksnkKhoaId };
}

/** Chỉ resolve khoa KSNK — dùng sau khi đã verify permission riêng. */
export async function ensureQlcvKsnkKhoaId() {
  const supabase = createAdminSupabaseClient();
  const ksnkKhoaId = await resolveKsnkKhoaId(supabase);
  return { supabase, ksnkKhoaId };
}
