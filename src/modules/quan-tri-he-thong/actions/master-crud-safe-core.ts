"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";

const SAFE_ALLOWLIST = new Set(["mdm_nhan_su", "dm_bang_kiem", "dm_tieu_chi_bang_kiem"]);

function assertSafeTable(tableName: string) {
  if (!SAFE_ALLOWLIST.has(tableName)) {
    throw new Error(`Bảng không nằm trong safe allowlist: ${tableName}`);
  }
}

export async function upsertSafeRow(tableName: string, id: string, payload: Record<string, unknown>) {
  assertSafeTable(tableName);
  const supabase = createAdminSupabaseClient();
  const result = id
    ? await supabase.from(tableName).update(payload).eq("id", id)
    : await supabase.from(tableName).insert([payload]);
  if (result.error) return { success: false as const, error: result.error.message };
  return { success: true as const };
}

export async function softDeleteSafeRow(tableName: string, id: string) {
  assertSafeTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function softDeleteManySafeRows(tableName: string, ids: string[]) {
  assertSafeTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function toggleSafeStatus(tableName: string, id: string, currentStatus: boolean) {
  assertSafeTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
