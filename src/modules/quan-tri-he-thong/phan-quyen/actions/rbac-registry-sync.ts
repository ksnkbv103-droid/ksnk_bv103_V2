import type { SupabaseClient } from "@supabase/supabase-js";
import { getFlatPermissions } from "@/lib/permission-registry";
import { syncKsnkRolePermissionMappings } from "./rbac-ksnk-role-mappings";

/** Upsert ADMIN role, permissions từ registry, và gán full quyền cho ADMIN. */
export async function upsertRegistryPermissionsAndAdminMappings(supabase: SupabaseClient) {
  // 0. Dọn dẹp các vai trò trùng lặp (ví dụ 'Admin', 'admin') để đảm bảo SSOT duy nhất là 'ADMIN'
  const { data: legacyAdmins } = await supabase
    .from("sys_roles")
    .select("id, name")
    .ilike("name", "admin");

  const duplicateIds = (legacyAdmins || [])
    .filter((r) => r.name !== "ADMIN")
    .map((r) => r.id);

  if (duplicateIds.length > 0) {
    console.log(`[RBAC] Cleaning up ${duplicateIds.length} duplicate Admin roles...`);
    await supabase.from("sys_role_permissions").delete().in("role_id", duplicateIds);
    await supabase.from("sys_roles").delete().in("id", duplicateIds);
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

  const { data: adminRole } = await supabase.from("sys_roles").select("id").eq("name", "ADMIN").single();
  if (adminRole) {
    const { data: allP } = await supabase.from("sys_permissions").select("id");
    if (allP) {
      const mappings = allP.map((p) => ({ role_id: adminRole.id, permission_id: p.id }));
      const { error: rErr } = await supabase
        .from("sys_role_permissions")
        .upsert(mappings, { onConflict: "role_id,permission_id" });
      if (rErr) throw rErr;
    }
  }

  await syncKsnkRolePermissionMappings(supabase);
}
