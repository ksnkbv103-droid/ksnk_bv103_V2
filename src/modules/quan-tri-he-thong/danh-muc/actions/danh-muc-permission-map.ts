import { getRegistryEntry } from "@/lib/master-data/domain-registry";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";

/**
 * Tính module quyền VIEW theo loại danh mục.
 * Fail-closed: type không hợp lệ sẽ throw từ registry.
 */
export function resolveDanhMucViewModuleByType(type: string): string {
  const normalizedType = String(type || "").trim().toUpperCase();
  const registry = getRegistryEntry(normalizedType);
  return getRegistryModuleForMasterTable(registry.sourceTable) ?? "DANH_MUC";
}
