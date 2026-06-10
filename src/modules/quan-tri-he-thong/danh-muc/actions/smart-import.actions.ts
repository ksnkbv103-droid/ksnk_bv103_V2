// src/modules/quan-tri-he-thong/danh-muc/actions/smart-import.actions.ts
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { revalidatePath } from "next/cache";
import { formatHoSoKhoaFkViolation, formatHoSoNhanSuWriteError } from "@/modules/quan-tri-he-thong/nhan-su/actions/nhan-su-fk-normalize";
import { createDmImportSessionCache } from "../lib/smart-import/dm-import-session-cache";
import { buildImportErrorMessage } from "../lib/smart-import/dm-row-normalizers";
import { resolveSmartImportScopeForTable, withResolvedLoaiValues } from "./smart-import-per-table";
import { normalizeImportedRowTypedValues, sanitizeSmartImportRowPayload } from "../lib/smart-import/row-typed-values";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";
import { randomUUID } from "crypto";

interface SmartImportConfig {
  tableName: string;
  uniqueKey: string;
  codePrefix?: string;
  fixedValues?: Record<string, unknown>;
}

const SMART_IMPORT_TABLE_UNIQUE_KEY: Record<string, string> = {
  mdm_dm_khoa_phong: "ma_khoa",
  cssd_dm_bo_dung_cu_chi_tiet: "ma_chi_tiet",
  cssd_dm_loai_dung_cu: "ma_loai_dung_cu",
  cssd_dm_hoa_chat: "ma_hoa_chat",
  cssd_dm_bo_dung_cu: "ma_bo",
  cssd_dm_thiet_bi: "ma_thiet_bi",
  mdm_nhan_su: "ma_nv",
};

function errSmartImport(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function formatSmartImportDbError(tableName: string, message: string) {
  if (tableName !== "mdm_nhan_su") return message;
  return formatHoSoNhanSuWriteError(message) || formatHoSoKhoaFkViolation(message) || message;
}

export async function smartImportData(config: SmartImportConfig, data: Record<string, unknown>[]) {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "File import không có dữ liệu hợp lệ." };
    }
    const expectedUniqueKey = SMART_IMPORT_TABLE_UNIQUE_KEY[config.tableName];
    if (!expectedUniqueKey) {
      return { success: false, error: `Bảng không được phép Smart Import: ${config.tableName}` };
    }
    if (expectedUniqueKey !== config.uniqueKey) {
      return {
        success: false,
        error: `Cấu hình import không hợp lệ cho bảng ${config.tableName} (expected uniqueKey: ${expectedUniqueKey}).`,
      };
    }
    const importModule = getRegistryModuleForMasterTable(config.tableName);
    if (!importModule) {
      return { success: false, error: `Chưa map quyền import cho bảng: ${config.tableName}` };
    }
    await verifyPermission(importModule, "import");
    const supabase = createAdminSupabaseClient();
    const nhanSuDmSessionCache =
      config.tableName === "mdm_nhan_su" ? createDmImportSessionCache(supabase) : undefined;

    // Mapped views to query existing data correctly and retrieve JSONB attributes as flat fields
    const VIEW_MAP_FOR_READ: Record<string, string> = {
      cssd_dm_bo_dung_cu_chi_tiet: "v_cssd_bo_dung_cu_chi_tiet_full",
      cssd_dm_loai_dung_cu: "v_cssd_loai_dung_cu_summary",
    };
    const readTable = VIEW_MAP_FOR_READ[config.tableName] || config.tableName;

    let query = supabase.from(readTable).select(`id, ${config.uniqueKey}`);
    if (config.fixedValues) {
      Object.entries(config.fixedValues).forEach(([k, v]) => {
        query = query.eq(k, v);
      });
    }
    const { data: existingData } = await query;
    const existingRecords = (Array.isArray(existingData) ? existingData : []) as unknown as Record<
      string,
      unknown
    >[];

    const existingCodeToId = new Map<string, string>();
    const existingCodes = new Set<string>();
    existingRecords.forEach((r) => {
      const val = r[config.uniqueKey];
      if (val != null && val !== "") {
        const cStr = String(val);
        existingCodes.add(cStr);
        if (r.id) {
          existingCodeToId.set(cStr, String(r.id));
        }
      }
    });

    const importedCodes = new Set<string>();
    const preparedRows: Array<{
      rowNumber: number;
      code: string;
      payload: Record<string, unknown>;
    }> = [];
    const preparedIndexByCode = new Map<string, number>();

    let counter = 1;
    if (config.codePrefix) {
      const { data: lastItem } = await supabase
        .from(readTable)
        .select(config.uniqueKey)
        .order(config.uniqueKey, { ascending: false })
        .limit(1);
      if (lastItem && lastItem[0]) {
        const val = (lastItem[0] as unknown as Record<string, unknown>)[config.uniqueKey];
        if (val) {
          const match = String(val).match(/\d+/);
          if (match) counter = parseInt(match[0]) + 1;
        }
      }
    }

    const rowErrors: string[] = [];
    const dbErrors: string[] = [];
    const rowWarnings: string[] = [];
    for (const item of data) {
      const rowNumber = Number(item.__excel_row__ ?? 0);
      const { [config.uniqueKey]: code, id, created_at, updated_at, __excel_row__, ...rest } = item;
      const codeStr =
        code !== undefined && code !== null && String(code).trim() !== "" ? String(code) : "";
      const normalizedIsActive = String(item.is_active ?? "true").toLowerCase() !== "false";
      let scopeSafeRest = await withResolvedLoaiValues(supabase, rest as Record<string, unknown>, config.fixedValues);
      const scoped = await resolveSmartImportScopeForTable(
        supabase,
        config.tableName,
        scopeSafeRest as Record<string, unknown>,
        rowNumber,
        nhanSuDmSessionCache,
      );
      if (!scoped.ok) {
        rowErrors.push(scoped.error);
        continue;
      }
      scopeSafeRest = scoped.row;
      const note = String((scopeSafeRest as Record<string, unknown>).__import_notes__ || "").trim();
      if (note) {
        rowWarnings.push(`Dòng ${rowNumber || "?"}: ${note}`);
      }
      scopeSafeRest = sanitizeSmartImportRowPayload(
        normalizeImportedRowTypedValues(config.tableName, scopeSafeRest as Record<string, unknown>),
      ) as Record<string, unknown>;
      if (config.tableName === "mdm_dm_khoa_phong") {
        const ten = String((scopeSafeRest as Record<string, unknown>)["ten_khoa"] ?? "").trim();
        if (!ten) {
          rowErrors.push(`Dòng ${rowNumber || "?"}: thiếu ten_khoa.`);
          continue;
        }
      }
      if (config.tableName === "cssd_dm_hoa_chat") {
        const ten = String((scopeSafeRest as Record<string, unknown>)["ten_hoa_chat"] ?? "").trim();
        if (!ten) {
          rowErrors.push(`Dòng ${rowNumber || "?"}: thiếu ten_hoa_chat.`);
          continue;
        }
      }
      if (config.tableName === "cssd_dm_bo_dung_cu_chi_tiet") {
        const ten = String((scopeSafeRest as Record<string, unknown>)["ten_chi_tiet"] ?? "").trim();
        if (!ten) {
          rowErrors.push(`Dòng ${rowNumber || "?"}: thiếu ten_chi_tiet.`);
          continue;
        }
      }
      if (!codeStr && !config.codePrefix) {
        rowErrors.push(`Dòng ${rowNumber || "?"}: thiếu mã định danh và chưa cấu hình codePrefix để tự sinh mã.`);
        continue;
      }
      const nextCode =
        codeStr ||
        (config.codePrefix ? `${config.codePrefix}${(counter++).toString().padStart(3, "0")}` : undefined);
      const finalCode = String(nextCode || "").trim();
      if (!finalCode) {
        rowErrors.push(`Dòng ${rowNumber || "?"}: không thể tạo mã định danh.`);
        continue;
      }

      // Resolve existing ID or assign a new random UUID so upserts match on conflict ID
      const existingId = existingCodeToId.get(finalCode);
      const payloadId = existingId || randomUUID();

      const payload: Record<string, unknown> = {
        id: payloadId,
        [config.uniqueKey]: finalCode,
        ...scopeSafeRest,
        is_active: normalizedIsActive,
        updated_at: new Date().toISOString(),
      };

      // If hybrid JSONB table, pack the unique key into specs and delete the flat key
      const isHybrid = config.tableName in VIEW_MAP_FOR_READ;
      if (isHybrid) {
        const specs = (payload.specs as Record<string, unknown>) || {};
        specs[config.uniqueKey] = finalCode;
        payload.specs = specs;
        delete payload[config.uniqueKey];
      }

      const existingIndex = preparedIndexByCode.get(finalCode);
      if (existingIndex !== undefined) {
        preparedRows[existingIndex] = { rowNumber, code: finalCode, payload };
        rowWarnings.push(
          `Dòng ${rowNumber || "?"}: mã ${finalCode} bị trùng trong file, hệ thống dùng dữ liệu dòng xuất hiện sau.`,
        );
        continue;
      }
      preparedIndexByCode.set(finalCode, preparedRows.length);
      preparedRows.push({ rowNumber, code: finalCode, payload });
    }
    if (rowErrors.length > 0 || dbErrors.length > 0) {
      return {
        success: false,
        error: buildImportErrorMessage(rowErrors, dbErrors),
      };
    }

    const CHUNK_SIZE = 200;
    for (let i = 0; i < preparedRows.length; i += CHUNK_SIZE) {
      const chunk = preparedRows.slice(i, i + CHUNK_SIZE);
      const chunkPayload = chunk.map((x) => x.payload);
      const { error: chunkError } = await supabase
        .from(config.tableName)
        .upsert(chunkPayload, { onConflict: "id" });
      if (!chunkError) {
        chunk.forEach((row) => importedCodes.add(row.code));
        continue;
      }

      // Fallback từng dòng để giữ được thông báo lỗi rõ ràng.
      for (const row of chunk) {
        const { error } = await supabase
          .from(config.tableName)
          .upsert(row.payload, { onConflict: "id" });
        if (error) {
          dbErrors.push(
            `Dòng ${row.rowNumber || "?"} (${row.code}): ${formatSmartImportDbError(config.tableName, error.message)}`,
          );
          continue;
        }
        importedCodes.add(row.code);
      }
    }

    if (dbErrors.length > 0) {
      return {
        success: false,
        error: buildImportErrorMessage(rowErrors, dbErrors),
      };
    }

    const codesToDelete = Array.from(existingCodes).filter(c => !importedCodes.has(c));
    if (codesToDelete.length > 0) {
      const idsToDelete = codesToDelete.map(c => existingCodeToId.get(c)).filter(Boolean) as string[];
      if (idsToDelete.length > 0) {
        const { error } = await supabase
          .from(config.tableName)
          .update({ is_active: false })
          .in("id", idsToDelete);
        if (error) {
          return { success: false, error: `Không thể soft-delete dữ liệu thiếu trong file: ${error.message}` };
        }
      }
    }

    revalidatePath("/quan-tri-he-thong");
    return {
      success: true,
      warning:
        rowWarnings.length > 0
          ? `Có ${rowWarnings.length} cảnh báo mapping. Ví dụ: ${rowWarnings.slice(0, 3).join(" ; ")}`
          : undefined,
    };
  } catch (error: unknown) {
    console.error(`[SMART SYNC ERROR - ${config.tableName}]`, error);
    return { success: false, error: errSmartImport(error) };
  }
}
