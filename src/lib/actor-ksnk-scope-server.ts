 
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getActorAuthUserId } from "@/lib/actor-auth-server";
import type { ActorKsnkScope } from "@/lib/actor-ksnk-scope.types";

function normRole(r: unknown): string {
  return String(r || "").trim().toUpperCase();
}

export async function getActorKsnkScope(): Promise<ActorKsnkScope> {
  const authUserId = await getActorAuthUserId();
  if (!authUserId) {
    return {
      roles: [],
      actorNhanSuId: null,
      actorKhoaId: null,
      isAdmin: false,
      isNhanVienKsnk: false,
      isMangLuoiKsnk: false,
    };
  }

  const supabase = createAdminSupabaseClient();

  const [{ data: permData }, { data: staffData }] = await Promise.all([
    supabase.from("v_auth_user_permissions").select("roles").eq("auth_user_id", authUserId).maybeSingle(),
    supabase
      .from("mdm_nhan_su")
      .select("id,khoa_id")
      .eq("auth_user_id", authUserId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const roles = (permData?.roles as string[] | null) || [];
  const rolesNorm = roles.map(normRole).filter(Boolean);

  const actorNhanSuId = staffData?.id ? String(staffData.id) : null;
  const actorKhoaId = staffData?.khoa_id ? String(staffData.khoa_id) : null;

  const isAdmin = rolesNorm.includes("ADMIN");
  const isNhanVienKsnk = rolesNorm.includes("NHAN_VIEN_KSNK");
  const isMangLuoiKsnk = [
    "MANG_LUOI_KSNK",
    "TO_TRUONG_MANG_LUOI_KSNK",
    "THANH_VIEN_MANG_LUOI_KSNK",
  ].some((r) => rolesNorm.includes(r));

  return { roles: rolesNorm, actorNhanSuId, actorKhoaId, isAdmin, isNhanVienKsnk, isMangLuoiKsnk };
}

