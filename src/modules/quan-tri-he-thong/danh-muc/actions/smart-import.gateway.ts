"use server";

/**
 * Cửa công khai Smart Import danh mục (một lát dọc Quản trị).
 * UI nên gọi `smartImportMasterTable` — không tự ghép uniqueKey.
 *
 * Allowlist: `smart-import.contract.ts` · resolvers: `smart-import-parent-resolvers.ts`.
 * Type options/table: import từ `smart-import.contract` (không re-export type từ file use server).
 */

import { smartImportData } from "./smart-import.actions";
import {
  SMART_IMPORT_TABLE_UNIQUE_KEY,
  type SmartImportOptions,
  type SmartImportTable,
} from "./smart-import.contract";

/** Nạp master theo tên bảng allowlist — uniqueKey lấy từ contract. */
export async function smartImportMasterTable(
  tableName: SmartImportTable,
  data: Record<string, unknown>[],
  options?: SmartImportOptions,
) {
  return smartImportData(
    {
      tableName,
      uniqueKey: SMART_IMPORT_TABLE_UNIQUE_KEY[tableName],
    },
    data,
    options,
  );
}
