import type { SupabaseClient } from "@supabase/supabase-js";
import { getFlatPermissions } from "@/lib/permission-registry";
import { syncKsnkRolePermissionMappings } from "./rbac-ksnk-role-mappings";

/**
 * Upsert ADMIN + permissions từ registry + gán full quyền ADMIN.
 * Không ghi đè ma trận vai trò KSNK (dùng `applyKsnkRolePermissionPresets`).
 */
export async function upsertRegistryPermissionsAndAdminMappings(supabase: SupabaseClient) {
  // 0. Dọn dẹp các vai trò trùng lặp (ví dụ 'Admin', 'admin') để đảm bảo SSOT duy nhất là 'ADMIN'
  // Xóa cứng có chủ đích: `v_sys_user_permissions` không lọc `sys_roles.is_active`,
  // nên tắt mềm vẫn để vai trò trùng cấp quyền. FK CASCADE gỡ luôn user_roles/role_permissions.
  const { data: legacyAdmins, error: legacyErr } = await supabase
    .from("sys_roles")
    .select("id, name")
    .ilike("name", "admin");
  if (legacyErr) throw legacyErr;

  const duplicateIds = (legacyAdmins || [])
    .filter((r) => r.name !== "ADMIN")
    .map((r) => r.id);

  if (duplicateIds.length > 0) {
    const { error: dupErr } = await supabase.from("sys_roles").delete().in("id", duplicateIds);
    if (dupErr) throw dupErr;
  }

  const { error: roleUpsertErr } = await supabase.from("sys_roles").upsert(
    { name: "ADMIN", description: "Quản trị hệ thống (Root)", updated_at: new Date().toISOString() },
    { onConflict: "name" },
  );
  if (roleUpsertErr) throw roleUpsertErr;

  const perms = getFlatPermissions();
  const permRows = perms.map((p) => ({
    module_name: p.module_name,
    action: p.action,
    description: p.description,
  }));
  const { error: pErr } = await supabase.from("sys_permissions").upsert(permRows, {
    onConflict: "module_name,action",
  });
  if (pErr) throw pErr;

  const { data: adminRole, error: adminErr } = await supabase.from("sys_roles").select("id").eq("name", "ADMIN").single();
  if (adminErr) throw adminErr;
  if (adminRole) {
    const { data: allP, error: allPErr } = await supabase.from("sys_permissions").select("id");
    if (allPErr) throw allPErr;
    if (allP) {
      const mappings = allP.map((p) => ({ role_id: adminRole.id, permission_id: p.id }));
      const { error: rErr } = await supabase
        .from("sys_role_permissions")
        .upsert(mappings, { onConflict: "role_id,permission_id" });
      if (rErr) throw rErr;
    }
  }
}

/** Ghi đè mapping quyền các vai trò KSNK active theo preset code. */
export async function applyKsnkRolePermissionPresets(supabase: SupabaseClient) {
  await syncKsnkRolePermissionMappings(supabase);
}
