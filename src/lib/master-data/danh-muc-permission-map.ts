import { getRegistryEntry } from "@/lib/master-data/domain-registry";
import { getRegistryModuleForMasterTable } from "@/lib/master-data/master-table-permission-map";

/** Module quyền VIEW theo loại danh mục (fail-closed qua registry). */
export function resolveDanhMucViewModuleByType(type: string): string {
  const normalizedType = String(type || "").trim().toUpperCase();
  const registry = getRegistryEntry(normalizedType);
  return getRegistryModuleForMasterTable(registry.sourceTable) ?? "DANH_MUC";
}
