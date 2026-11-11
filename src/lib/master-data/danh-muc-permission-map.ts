import { getRegistryEntry } from "@/lib/master-data/domain-registry";
import { getRegistryModuleForMasterTable } from "@/lib/master-data/master-table-permission-map";

/** Khóa không cấp cho vai trò nào — loại chưa map chỉ ADMIN qua (AR-8h bỏ fallback DANH_MUC). */
const UNMAPPED_ADMIN_ONLY = "__ADMIN_ONLY__";

/** Module quyền VIEW theo loại danh mục (fail-closed qua registry). */
export function resolveDanhMucViewModuleByType(type: string): string {
  const normalizedType = String(type || "").trim().toUpperCase();
  const registry = getRegistryEntry(normalizedType);
  return getRegistryModuleForMasterTable(registry.sourceTable) ?? UNMAPPED_ADMIN_ONLY;
}
