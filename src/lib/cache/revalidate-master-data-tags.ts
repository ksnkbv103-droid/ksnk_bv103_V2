import { revalidateTag } from "next/cache";

/** Khớp `tags` trong `master-data-cache.ts` (unstable_cache). */
const TABLES_WITH_ROW_CACHE_TAG = new Set([
  "dm_khoa_phong",
  "dm_nghe_nghiep",
  "dm_khu_vuc_giam_sat",
]);

/** Gọi sau mutation thành công tới bảng danh mục có cache theo dòng. */
export function revalidateMasterDataRowCacheTag(tableName: string) {
  if (TABLES_WITH_ROW_CACHE_TAG.has(tableName)) {
    revalidateTag(tableName, "default");
    // Các dropdown giám sát lấy qua RPC registry và cache theo tag "registries".
    // Nếu không revalidate tag này sau mutation, UI có thể hiển thị rỗng tạm thời dù DB đã có dữ liệu.
    revalidateTag("registries", "default");
  }
}
