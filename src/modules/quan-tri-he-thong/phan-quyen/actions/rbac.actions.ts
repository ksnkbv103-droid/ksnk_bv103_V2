"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { ensureRbacAdmin } from "./rbac-auth.helpers";
import { upsertRegistryPermissionsAndAdminMappings } from "./rbac-registry-sync";
import type { RBACDataResult } from "../rbac.types";

function errRbac(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Đồng bộ toàn bộ Permission Registry vào Database.
 * Tự động gán FULL quyền cho ADMIN.
 */
export async function syncPermissionRegistry() {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    console.log("[RBAC] Syncing Permission Registry...");
    await upsertRegistryPermissionsAndAdminMappings(supabase);

    console.log("[RBAC] Sync completed successfully!");
    revalidatePath("/quan-tri-he-thong/phan-quyen");
    return { success: true };
  } catch (error: unknown) {
    console.error("[SYNC ERROR]", error);
    return { success: false, error: errRbac(error) };
  }
}

/**
 * Các hàm cũ được map về syncPermissionRegistry để tương thích ngược
 */
export async function seedDefaultRBAC() {
  return await syncPermissionRegistry();
}

export async function reseedFullRBAC() {
  return await syncPermissionRegistry();
}

export async function seedFullRBAC() {
  return await syncPermissionRegistry();
}


export async function getRBACData(): Promise<RBACDataResult> {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();

    // Fetch roles and permissions in parallel
    const [rolesRes, permsRes, matrixRes] = await Promise.all([
      supabase.from("dm_roles").select("*").order("name"),
      supabase.from("dm_permissions").select("*").order("module_name").order("action"),
      supabase.from("v_role_permissions_matrix").select("*")
    ]);
    
    if (rolesRes.error) throw new Error(`Lỗi tải Roles: ${rolesRes.error.message}`);
    if (permsRes.error) throw new Error(`Lỗi tải Permissions: ${permsRes.error.message}`);
    if (matrixRes.error) throw new Error(`Lỗi tải Matrix: ${matrixRes.error.message}`);

    // Transform matrix view data back to mapping format for compatibility
    const mappings: { role_id: string; permission_id: string }[] = [];
    (matrixRes.data || []).forEach(row => {
      (row.permission_ids || []).forEach((pid: string) => {
        mappings.push({ role_id: row.role_id, permission_id: pid });
      });
    });

    return {
      success: true,
      roles: rolesRes.data || [],
      permissions: permsRes.data || [],
      mappings: mappings
    };
  } catch (error: unknown) {
    console.error("[RBAC ACTION ERROR]", error);
    return { success: false, error: errRbac(error) };
  }
}

export async function saveFullRBACMatrix(matrix: Record<string, string[]>) {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    // 1. Chuẩn bị dữ liệu insert
    const records: { role_id: string; permission_id: string }[] = [];
    
    Object.entries(matrix).forEach(([roleId, permissionIds]) => {
      permissionIds.forEach(pid => {
        records.push({
          role_id: roleId,
          permission_id: pid
        });
      });
    });
    const { data: adminRole } = await supabase.from("dm_roles").select("id").eq("name", "ADMIN").maybeSingle();
    const { data: allPerms } = await supabase.from("dm_permissions").select("id");
    if (adminRole?.id && allPerms?.length) {
      allPerms.forEach((p: { id: string }) => records.push({ role_id: adminRole.id, permission_id: p.id }));
    }

    // 2) Delta update để tránh trạng thái mất quyền toàn cục nếu lỗi giữa chừng.
    const { data: existingRows, error: existingErr } = await supabase
      .from("rel_role_permissions")
      .select("role_id, permission_id");
    if (existingErr) throw existingErr;

    const toKey = (r: { role_id: string; permission_id: string }) => `${r.role_id}:${r.permission_id}`;
    const existing = new Set((existingRows || []).map((r) => toKey(r as { role_id: string; permission_id: string })));
    const incoming = new Set(records.map((r) => toKey(r)));

    const inserts = records.filter((r) => !existing.has(toKey(r)));
    const removals = (existingRows || []).filter(
      (r) => !incoming.has(toKey(r as { role_id: string; permission_id: string })),
    ) as Array<{ role_id: string; permission_id: string }>;

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("rel_role_permissions")
        .upsert(inserts, { onConflict: "role_id,permission_id" });
      if (insertError) throw insertError;
    }

    for (const row of removals) {
      const { error: delErr } = await supabase
        .from("rel_role_permissions")
        .delete()
        .eq("role_id", row.role_id)
        .eq("permission_id", row.permission_id);
      if (delErr) throw delErr;
    }

    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errRbac(error) };
  }
}

export async function updateRolePermission(roleId: string, permissionId: string, granted: boolean) {
  try {
    await ensureRbacAdmin();
    const supabase = createAdminSupabaseClient();
    if (granted) {
      const { error } = await supabase.from("rel_role_permissions").insert({
        role_id: roleId,
        permission_id: permissionId
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("rel_role_permissions").delete().eq("role_id", roleId).eq("permission_id", permissionId);
      if (error) throw error;
    }
    revalidatePath("/quan-tri-he-thong");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errRbac(error) };
  }
}
