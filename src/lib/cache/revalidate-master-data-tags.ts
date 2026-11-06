import { revalidateTag } from "next/cache";

/** Khớp `tags` trong `master-data-cache.ts` (unstable_cache). */
const TABLES_WITH_ROW_CACHE_TAG = new Set([
  "mdm_dm_khoa_phong",
  "mdm_dm_nghe_nghiep",
  "gstt_dm_khu_vuc_giam_sat",
  "mdm_dm_khoi_khoa",
]);

/** Bảng ảnh hưởng tới dropdown bundle `registries` trong master-data-gateway.actions.ts */
const TABLES_AFFECTING_REGISTRIES = new Set([
  "mdm_dm_khoa_phong",
  "gstt_dm_khu_vuc_giam_sat",
  "gstt_dm_hinh_thuc_giam_sat",
  "gstt_dm_cach_thuc_giam_sat",
  "mdm_dm_nghe_nghiep",
]);

/** Ánh xạ bảng danh mục sang category type dùng cho tags `danh-muc-${type}` (categories-by-type.ts) */
const TABLE_TO_CATEGORY_TYPE: Record<string, string> = {
  mdm_dm_khoa_phong: "KHOA_PHONG",
  mdm_dm_nghe_nghiep: "NGHE_NGHIEP",
  gstt_dm_khu_vuc_giam_sat: "KHU_VUC_GIAM_SAT",
  nkbv_dm_loai: "LOAI_NKBV",
  mdm_dm_chuc_vu: "CHUC_VU",
  mdm_dm_chuc_danh: "CHUC_DANH",
  mdm_dm_khoi_khoa: "KHOI_KHOA",
  mdm_dm_to_cong_tac: "TO_CONG_TAC",
  cssd_dm_tram: "TRAM_CSSD",
  cssd_dm_loai_may: "LOAI_MAY_TIET_KHUAN",
  cssd_dm_loai_su_co: "LOAI_SU_CO",
  gstt_dm_cach_thuc_giam_sat: "CACH_THUC_GIAM_SAT",
  gstt_dm_hinh_thuc_giam_sat: "HINH_THUC_GIAM_SAT",
  nkbv_dm_trang_thai_ca: "TRANG_THAI_NKBV_CA",
};

/** Tag dùng cho stats Trung tâm Danh mục (RPC `fn_admin_module_stats`). */
export const ADMIN_MODULE_STATS_TAG = "admin-module-stats";

/**
 * Gọi sau mutation thành công tới bảng danh mục.
 * - Invalidate cache theo dòng nếu bảng nằm trong `TABLES_WITH_ROW_CACHE_TAG`.
 * - Invalidate tag `registries` nếu đụng bảng cốt lõi của dropdown.
 * - Invalidate tags `danh-muc-${catType}` và `danh-muc-static` (categories-by-type.ts).
 * - LUÔN invalidate `admin-module-stats` (Slice 9) vì mọi mutation MDM đều có thể đổi số liệu dashboard.
 */
export function revalidateMasterDataRowCacheTag(tableName: string) {
  if (TABLES_WITH_ROW_CACHE_TAG.has(tableName)) {
    revalidateTag(tableName, "default");
  }
  if (TABLES_AFFECTING_REGISTRIES.has(tableName)) {
    revalidateTag("registries", "default");
  }
  const catType = TABLE_TO_CATEGORY_TYPE[tableName];
  if (catType) {
    revalidateTag(`danh-muc-${catType}`, "default");
    revalidateTag("danh-muc-static", "default");
  }
  revalidateTag(ADMIN_MODULE_STATS_TAG, "default");
}
