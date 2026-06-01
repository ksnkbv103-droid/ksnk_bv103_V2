"use server";

/**
 * Master CRUD core - server actions thao tác bảng MDM/DM.
 *
 * SSOT bảng vật lý sau đợt rename 25/05/2026 (xem `docs/core/implementation-mapping.md`):
 * - `dm_thiet_bi`         → SSOT `cssd_dm_thiet_bi`
 * - `dm_hoa_chat`         → SSOT `cssd_dm_hoa_chat`
 * - `dm_khoa_phong`       → SSOT `mdm_dm_khoa_phong`
 * - `dm_loai_dung_cu`     → SSOT `cssd_dm_loai_dung_cu`
 * - `dm_bo_dung_cu*`      → SSOT `cssd_dm_bo_dung_cu*`
 * - `dm_tram_cssd`        → SSOT `cssd_dm_tram`
 * - `dm_loai_may_tiet_khuan` → SSOT `cssd_dm_loai_may`
 * - `dm_roles`            → SSOT TABLE `sys_roles` (`auth_dm_roles` đã được DROP — 26/05/2026)
 * - Các loại lookup phẳng (TO_CONG_TAC, CHUC_DANH, CHUC_VU, NGHE_NGHIEP, …)
 *   → CONSOLIDATED_MAPS dưới đây ghi vào `sys_lookup_value` (SSOT đã chọn theo Slice 8 plan).
 * - `dm_bang_kiem`        → SSOT `gstt_dm_bang_kiem`
 *
 * Allowlist GIỮ TÊN VIEW (`dm_*`) vì đầu vào API đến từ `domain-registry.sourceTable`,
 * và `domain-registry` là contract API hợp đồng giữa app ↔ admin form.
 * Postgres tự inline view → không chi phí runtime.
 */

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidateMasterDataRowCacheTag } from "@/lib/cache/revalidate-master-data-tags";

const MASTER_TABLE_ALLOWLIST = new Set([
  "dm_bo_dung_cu",
  "dm_bo_dung_cu_chi_tiet",
  "dm_thiet_bi",
  "dm_hoa_chat",
  "dm_khoa_phong",
  "dm_khoi_khoa",
  "dm_tram_cssd",
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
]);

// Cấu trúc ánh xạ 13 bảng danh mục & trạng thái cũ sang dm_lookup_value
const CONSOLIDATED_MAPS: Record<
  string,
  {
    categoryType: string;
    maColumn: string;
    tenColumn: string;
    metadataColumns?: string[];
  }
> = {
  dm_cach_thuc_giam_sat: { categoryType: "CACH_THUC_GIAM_SAT", maColumn: "ma_cach_thuc", tenColumn: "ten_cach_thuc" },
  dm_chuc_danh: { categoryType: "CHUC_DANH", maColumn: "ma_chuc_danh", tenColumn: "ten_chuc_danh" },
  dm_chuc_vu: { categoryType: "CHUC_VU", maColumn: "ma_chuc_vu", tenColumn: "ten_chuc_vu" },
  dm_hinh_thuc_giam_sat: { categoryType: "HINH_THUC_GIAM_SAT", maColumn: "ma_hinh_thuc", tenColumn: "ten_hinh_thuc" },
  dm_khoi_khoa: { categoryType: "KHOI_KHOA", maColumn: "ma_khoi", tenColumn: "ten_khoi" },
  dm_tram_cssd: { categoryType: "TRAM_CSSD", maColumn: "ma_tram", tenColumn: "ten_tram", metadataColumns: ["thu_tu"] },
  dm_loai_cong_viec: { categoryType: "LOAI_CONG_VIEC", maColumn: "ma", tenColumn: "ten", metadataColumns: ["thu_tu"] },
  dm_loai_may_tiet_khuan: { categoryType: "LOAI_MAY_TIET_KHUAN", maColumn: "ma_loai_may", tenColumn: "ten_loai_may" },
  dm_loai_nkbv: { categoryType: "LOAI_NKBV", maColumn: "ma_loai", tenColumn: "ten_loai" },
  dm_loai_su_co: { categoryType: "LOAI_SU_CO", maColumn: "ma_loai_su_co", tenColumn: "ten_loai_su_co" },
  dm_nghe_nghiep: { categoryType: "NGHE_NGHIEP", maColumn: "ma_nghe_nghiep", tenColumn: "ten_nghe_nghiep" },
  dm_to_cong_tac: { categoryType: "TO_CONG_TAC", maColumn: "ma_to", tenColumn: "ten_to" },
  dm_trang_thai_cong_viec: { categoryType: "TRANG_THAI_CONG_VIEC", maColumn: "ma", tenColumn: "ten", metadataColumns: ["mau_sac", "thu_tu"] },
  dm_trang_thai_nkbv_ca: { categoryType: "TRANG_THAI_NKBV_CA", maColumn: "ma_trang_thai", tenColumn: "ten_trang_thai", metadataColumns: ["thu_tu"] },
};

function assertAllowedTable(tableName: string) {
  if (!MASTER_TABLE_ALLOWLIST.has(tableName)) {
    throw new Error(`Bảng không nằm trong allowlist: ${tableName}`);
  }
}

function convertToLookupPayload(tableName: string, payload: Record<string, unknown>, categoryType: string) {
  const config = CONSOLIDATED_MAPS[tableName];
  if (!config) return payload;

  const { maColumn, tenColumn, metadataColumns } = config;

  const code = String(
    payload[maColumn] ?? 
    payload["ma_loai"] ?? 
    payload["ma_loai_dung_cu"] ?? 
    payload["ma_loai_su_co"] ??
    payload["ma_loai_may"] ??
    payload["ma_nghe_nghiep"] ??
    payload["ma_to"] ??
    payload["ma_trang_thai"] ??
    payload["ma"] ?? 
    ""
  ).trim();

  const name = String(
    payload[tenColumn] ?? 
    payload["ten_loai"] ?? 
    payload["ten_loai_dung_cu"] ?? 
    payload["ten_loai_su_co"] ??
    payload["ten_loai_may"] ??
    payload["ten_nghe_nghiep"] ??
    payload["ten_to"] ??
    payload["ten_trang_thai"] ??
    payload["ten"] ?? 
    ""
  ).trim();

  const description = String(payload["description"] ?? payload["mo_ta"] ?? payload["ghi_chu"] ?? "");
  const is_active = payload["is_active"] !== undefined ? Boolean(payload["is_active"]) : true;

  const lookupPayload: Record<string, any> = {
    category_type: categoryType,
    code,
    name,
    description,
    is_active,
    updated_at: new Date().toISOString(),
  };

  // Xử lý metadata động cho các trường đặc thù
  if (metadataColumns && metadataColumns.length > 0) {
    const metadata: Record<string, any> = {};
    for (const col of metadataColumns) {
      if (payload[col] !== undefined) {
        metadata[col] = payload[col];
      }
    }
    lookupPayload.metadata = metadata;
  }

  return lookupPayload;
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
  const config = CONSOLIDATED_MAPS[tableName];

  if (config) {
    // Intercept tác vụ ghi và điều hướng sang sys_lookup_value (SSOT post 25/05; `dm_lookup_value` là view).
    const lookupPayload = convertToLookupPayload(tableName, payload, config.categoryType);
    const { error } = id
      ? await supabase.from("sys_lookup_value").update(lookupPayload).eq("id", id)
      : await supabase.from("sys_lookup_value").insert([lookupPayload]);

    if (error) return { success: false as const, error: error.message };
  } else {
    // Luồng CRUD vật lý thông thường cho các bảng cốt lõi (dm_thiet_bi, dm_hoa_chat, v.v.)
    const { error } = id
      ? await supabase.from(tableName).update(payload).eq("id", id)
      : await supabase.from(tableName).insert([payload]);

    if (error) return { success: false as const, error: error.message };
  }

  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

export async function toggleMasterStatus(tableName: string, id: string, currentStatus: boolean) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const targetTable = CONSOLIDATED_MAPS[tableName] ? "sys_lookup_value" : tableName;

  const { error } = await supabase
    .from(targetTable)
    .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

export async function softDeleteMasterRow(tableName: string, id: string) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const targetTable = CONSOLIDATED_MAPS[tableName] ? "sys_lookup_value" : tableName;

  const { error } = await supabase
    .from(targetTable)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

export async function softDeleteManyMasterRows(tableName: string, ids: string[]) {
  assertAllowedTable(tableName);
  const supabase = createAdminSupabaseClient();
  const targetTable = CONSOLIDATED_MAPS[tableName] ? "sys_lookup_value" : tableName;

  const { error } = await supabase
    .from(targetTable)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) return { success: false as const, error: error.message };
  revalidateMasterDataRowCacheTag(tableName);
  return { success: true as const };
}

