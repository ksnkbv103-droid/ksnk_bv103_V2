"use server";

/**
 * RBAC server actions.
 *
 * Slice 4 mở rộng (26/05/2026 Phase A):
 * - `getRBACData` (read-only): user client → RLS PHAN_QUYEN.view kick in
 *   (policy "<table>_select" và "*_select_all_authenticated_v2" cho phép).
 * - `syncPermissionRegistry`/`saveFullRBACMatrix`: **giữ admin client**
 *   vì bootstrap/seed logic cần bypass RLS (gán 100 perm cho ADMIN, fix-up matrix).
 *   `ensureRbacAdmin()` đã chặt từ tầng app (break-glass env hoặc ADMIN role hoặc PHAN_QUYEN.edit).
 */

import { logAdminAction } from "@/lib/admin-audit";
import { invalidateUserPermissionsCache } from "@/lib/server-permission";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import { quanTriHubHref } from "@/lib/master-data/quan-tri-paths";
import { ensureRbacAdmin } from "./rbac-auth.helpers";
import { hasSelfRolePermissionEdits } from "./rbac-matrix-self-edit";
import {
  applyKsnkRolePermissionPresets,
  upsertRegistryPermissionsAndAdminMappings,
} from "./rbac-registry-sync";
import type { RBACDataResult } from "../rbac.types";
import { parseOrFirstError } from "@/lib/validations/master-data-write.validations";
import { rbacMatrixSchema } from "@/lib/validations/danh-muc-write.validations";

function errRbac(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

const AUDIT_FAILED_MSG =
  "Đã lưu thay đổi quyền nhưng chưa ghi được nhật ký — kiểm tra nhật ký trước khi thử lại";

/**
 * Quyền đã commit: luôn xóa cache quyền trước, rồi mới ghi audit (fail-closed).
 * Audit lỗi → trả success:false với thông báo rõ, cache đã được làm mới.
 */
async function invalidateThenAudit(
  audit: () => Promise<void>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await invalidateUserPermissionsCache();
  try {
    await audit();
    return { ok: true };
  } catch (e: unknown) {
    console.error("[rbac] audit failed after permission write", { module: "phan-quyen", error: errRbac(e) });
    return { ok: false, error: `${AUDIT_FAILED_MSG} (${errRbac(e)})` };
  }
}

async function fetchAllRolePermissionRows(supabase: ReturnType<typeof createAdminSupabaseClient>) {
  return fetchAllRangeRows<{ role_id: string; permission_id: string }>((from, to) =>
    supabase
      .from("sys_role_permissions")
      .select("role_id, permission_id")
      .order("role_id")
      .order("permission_id")
      .range(from, to),
  );
}

/**
 * Đồng bộ Permission Registry → DB + full quyền ADMIN.
 * Không ghi đè ma trận vai trò KSNK (dùng `resetKsnkRolePermissionPresets`).
 */
export async function syncPermissionRegistry() {
  let userId: string | null = null;
  try {
    const actor = await ensureRbacAdmin();
    userId = actor.id;
    const supabase = createAdminSupabaseClient();

    await upsertRegistryPermissionsAndAdminMappings(supabase);

    const audited = await invalidateThenAudit(() =>
      logAdminAction({
        action: "SYNC_PERMISSION_REGISTRY",
        targetTable: "sys_permissions",
        actorUserId: actor.id,
        actorEmail: actor.email,
        failClosed: true,
      }),
    );
    if (!audited.ok) return { success: false, error: audited.error };
    revalidatePath(quanTriHubHref("PHAN_QUYEN"));
    revalidatePath(quanTriHubHref());
    return { success: true };
  } catch (error: unknown) {
    console.error("[rbac] syncPermissionRegistry failed", {
      module: "phan-quyen",
      action: "syncPermissionRegistry",
      userId,
      error: errRbac(error),
    });
    return { success: false, error: errRbac(error) };
  }
}

/**
 * Ghi đè quyền các vai trò KSNK active theo preset code (Hội đồng / NV / Mạng lưới / Khách).
 */
export async function resetKsnkRolePermissionPresets() {
  let userId: string | null = null;
  try {
    const actor = await ensureRbacAdmin();
    userId = actor.id;
    const supabase = createAdminSupabaseClient();

    await applyKsnkRolePermissionPresets(supabase);

    const audited = await invalidateThenAudit(() =>
      logAdminAction({
        action: "RESET_KSNK_ROLE_PRESETS",
        targetTable: "sys_role_permissions",
        actorUserId: actor.id,
        actorEmail: actor.email,
        failClosed: true,
      }),
    );
    if (!audited.ok) return { success: false, error: audited.error };
    revalidatePath(quanTriHubHref("PHAN_QUYEN"));
    revalidatePath(quanTriHubHref());
    return { success: true };
  } catch (error: unknown) {
    console.error("[rbac] resetKsnkRolePermissionPresets failed", {
      module: "phan-quyen",
      action: "resetKsnkRolePermissionPresets",
      userId,
      error: errRbac(error),
    });
    return { success: false, error: errRbac(error) };
  }
}

export async function getRBACData(): Promise<RBACDataResult> {
  try {
    await ensureRbacAdmin();
    const supabase = await createServerSupabaseUserClient();

    // Fetch roles and permissions in parallel
    const [rolesRes, permsRes, matrixRes] = await Promise.all([
      supabase.from("sys_roles").select("*").order("name"),
      supabase.from("sys_permissions").select("*").order("module_name").order("action"),
      supabase.from("v_sys_role_permissions_matrix").select("*")
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

export async function saveFullRBACMatrix(
  matrix: Record<string, string[]>,
  confirmActorPassword?: string,
) {
  try {
    const actor = await ensureRbacAdmin();
    const matrixShape = parseOrFirstError(rbacMatrixSchema, matrix);
    if (!matrixShape.ok) return { success: false, error: matrixShape.error };
    const { verifyCurrentActorPassword } = await import(
      "@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth"
    );
    const reauth = await verifyCurrentActorPassword(String(confirmActorPassword || ""));
    if (!reauth.ok) return { success: false, error: reauth.error };

    const supabase = createAdminSupabaseClient();

    const { data: actorRoles, error: arErr } = await supabase
      .from("sys_user_roles")
      .select("role_id")
      .eq("user_id", actor.id);
    if (arErr) throw arErr;
    const ownRoleIds = new Set((actorRoles || []).map((r) => String(r.role_id)));
    const { data: adminRole } = await supabase.from("sys_roles").select("id").eq("name", "ADMIN").maybeSingle();
    const adminRoleId = adminRole?.id ? String(adminRole.id) : null;

    // UI luôn gửi ma trận tổng (gồm ADMIN). Chỉ chặn khi thật sự đổi quyền vai trò non-ADMIN đang gắn với actor.
    const ownNonAdmin = [...ownRoleIds].filter((id) => id !== adminRoleId);
    if (ownNonAdmin.length > 0) {
      const { data: existingOwnRows, error: eoErr } = await supabase
        .from("sys_role_permissions")
        .select("role_id, permission_id")
        .in("role_id", ownNonAdmin);
      if (eoErr) throw eoErr;
      const existingByRole: Record<string, string[]> = {};
      for (const row of existingOwnRows || []) {
        const rid = String((row as { role_id: string }).role_id);
        (existingByRole[rid] ||= []).push(String((row as { permission_id: string }).permission_id));
      }
      if (
        hasSelfRolePermissionEdits({
          matrix,
          ownRoleIds: ownNonAdmin,
          adminRoleId,
          existingByRole,
        })
      ) {
        return {
          success: false,
          error: "Không được tự sửa quyền của vai trò đang gắn với bạn.",
        };
      }
    }

    const records: { role_id: string; permission_id: string }[] = [];
    Object.entries(matrix).forEach(([roleId, permissionIds]) => {
      permissionIds.forEach((pid) => {
        records.push({ role_id: roleId, permission_id: pid });
      });
    });
    const { data: allPerms } = await supabase.from("sys_permissions").select("id");
    if (adminRoleId && allPerms?.length) {
      allPerms.forEach((p: { id: string }) => records.push({ role_id: adminRoleId, permission_id: p.id }));
    }

    // Ảnh chụp trước để ghi diff trước/sau vào audit.
    const beforeRows = await fetchAllRolePermissionRows(supabase);
    const beforeKeys = new Set(beforeRows.map((r) => `${r.role_id}:${r.permission_id}`));
    const afterKeys = new Set(records.map((r) => `${r.role_id}:${r.permission_id}`));
    const added = [...afterKeys].filter((k) => !beforeKeys.has(k));
    const removed = [...beforeKeys].filter((k) => !afterKeys.has(k));

    // Ưu tiên RPC nguyên tử (ADM-03); fallback delta khi migration chưa apply.
    const { data: rpcData, error: rpcErr } = await supabase.rpc("rpc_save_rbac_matrix", {
      p_rows: records,
    });
    const rpcMissing =
      !!rpcErr &&
      (/could not find the function|rpc_save_rbac_matrix|PGRST202|404/i.test(rpcErr.message || "") ||
        rpcErr.code === "PGRST202");
    if (rpcErr && !rpcMissing) {
      throw new Error(rpcErr.message);
    }
    if (!rpcMissing) {
      if (rpcData && typeof rpcData === "object" && (rpcData as { success?: boolean }).success === false) {
        return {
          success: false,
          error: String((rpcData as { error?: string }).error || "Không lưu được ma trận."),
        };
      }
    } else {
      const existingRows = await fetchAllRolePermissionRows(supabase);

      const toKey = (r: { role_id: string; permission_id: string }) => `${r.role_id}:${r.permission_id}`;
      const existing = new Set(
        existingRows.map((r) => toKey(r)),
      );
      const incoming = new Set(records.map((r) => toKey(r)));
      const inserts = records.filter((r) => !existing.has(toKey(r)));
      const removals = existingRows.filter((r) => !incoming.has(toKey(r)));

      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from("sys_role_permissions")
          .upsert(inserts, { onConflict: "role_id,permission_id" });
        if (insertError) throw insertError;
      }
      for (const row of removals) {
        const { error: delErr } = await supabase
          .from("sys_role_permissions")
          .delete()
          .eq("role_id", row.role_id)
          .eq("permission_id", row.permission_id);
        if (delErr) throw delErr;
      }
    }

    const audited = await invalidateThenAudit(() =>
      logAdminAction({
        action: "CHANGE_RBAC_MATRIX",
        targetTable: "sys_role_permissions",
        before: { removed, count: beforeKeys.size },
        after: { added, roleIds: Object.keys(matrix), count: afterKeys.size, via: rpcMissing ? "delta_fallback" : "rpc" },
        actorUserId: actor.id,
        actorEmail: actor.email,
        failClosed: true,
      }),
    );
    if (!audited.ok) return { success: false, error: audited.error };

    revalidatePath(quanTriHubHref("PHAN_QUYEN"));
    revalidatePath(quanTriHubHref());
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errRbac(error) };
  }
}
