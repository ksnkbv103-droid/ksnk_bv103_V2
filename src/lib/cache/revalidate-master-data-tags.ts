import { revalidateTag } from "next/cache";

/** Khớp `tags` trong `master-data-cache.ts` (unstable_cache). */
const TABLES_WITH_ROW_CACHE_TAG = new Set([
  "dm_khoa_phong",
  "dm_nghe_nghiep",
  "dm_khu_vuc_giam_sat",
]);

/** Tag dùng cho stats Trung tâm Danh mục (RPC `fn_admin_module_stats`). */
export const ADMIN_MODULE_STATS_TAG = "admin-module-stats";

/**
 * Gọi sau mutation thành công tới bảng danh mục.
 * - Invalidate cache theo dòng nếu bảng nằm trong `TABLES_WITH_ROW_CACHE_TAG`.
 * - LUÔN invalidate `admin-module-stats` (Slice 9) vì mọi mutation MDM đều có thể đổi số liệu dashboard.
 * - Invalidate tag `registries` nếu đụng bảng cốt lõi của dropdown.
 */
export function revalidateMasterDataRowCacheTag(tableName: string) {
  if (TABLES_WITH_ROW_CACHE_TAG.has(tableName)) {
    revalidateTag(tableName, "default");
    revalidateTag("registries", "default");
  }
  revalidateTag(ADMIN_MODULE_STATS_TAG, "default");
}
