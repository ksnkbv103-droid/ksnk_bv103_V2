"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidateMasterDataRowCacheTag } from "@/lib/cache/revalidate-master-data-tags";

const MASTER_TABLE_ALLOWLIST = new Set([
  "dm_bo_dung_cu",
  "dm_bo_dung_cu_chi_tiet",
  "dm_thiet_bi",
  "dm_hoa_chat",
  "dm_khoa_phong",
  "dm_khoi_khoa",
  "dm_to_cong_tac",
  "dm_chuc_vu",
  "dm_chuc_danh",
  "dm_roles",
  "dm_khu_vuc_giam_sat",
  "dm_nghe_nghiep",
  "dm_loai_dung_cu",
  "dm_loai_su_co",
  "dm_loai_may_tiet_khuan",
  "dm_hinh_thuc_giam_sat",
  "dm_cach_thuc_giam_sat",
  "dm_loai_cong_viec",
  "dm_trang_thai_cong_viec",
  "dm_loai_nkbv",
  "dm_trang_thai_nkbv_ca",
  "mdm_nhan_su",
  "dm_bang_kiem",
  "dm_tieu_chi_bang_kiem",
]);

function assertAllowedTable(tableName: string) {
  if (!MASTER_TABLE_ALLOWLIST.has(tableName)) {
    throw new Error(`Bảng không nằm trong allowlist: ${tableName}`);
  }
}

export async function listMasterRows(tableName: string, orderBy: string) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  let query = supabase.from(tableName).select("*");
  query = query.order("is_active", { ascending: false });
  const { data, error } = await query.order(orderBy, { ascending: true });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data || [] };
}

export async function upsertMasterRow(tableName: string, id: string, payload: Record<string, unknown>) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = id
    ? await supabase.from(tableName).update(payload).eq("id", id)
    : await supabase.from(tableName).insert([payload]);
  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

export async function toggleMasterStatus(tableName: string, id: string, currentStatus: boolean) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

export async function softDeleteMasterRow(tableName: string, id: string) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

export async function softDeleteManyMasterRows(tableName: string, ids: string[]) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from(tableName)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}
