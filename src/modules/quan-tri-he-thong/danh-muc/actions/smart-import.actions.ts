// src/modules/quan-tri-he-thong/danh-muc/actions/smart-import.actions.ts
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyDanhMucLookupPermission } from "@/lib/master-data/danh-muc-lookup-permission";
import { revalidatePath } from "next/cache";
import { formatHoSoKhoaFkViolation, formatHoSoNhanSuWriteError } from "@/modules/quan-tri-he-thong/nhan-su/actions/nhan-su-fk-normalize";
import { createDmImportSessionCache } from "../lib/smart-import/dm-import-session-cache";
import { buildImportErrorMessage } from "../lib/smart-import/dm-row-normalizers";
import { resolveSmartImportScopeForTable, withResolvedLoaiValues } from "./smart-import-per-table";
import { normalizeImportedRowTypedValues, sanitizeSmartImportRowPayload } from "../lib/smart-import/row-typed-values";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";
import { isCssdCatalogMasterTable } from "@/lib/domain/cssd-catalog-master-write";
import { requireCssdCatalogMasterWrite } from "@/lib/master-data/require-cssd-catalog-master-write";
import { randomUUID } from "crypto";
import {
  normalizeLoaiDungCuExcelImportRow,
  syncLoaiPhysicalColumnsOnImportPayload,
} from "@/lib/master-data/cssd-loai-dung-cu-map";
import {
  isSmartImportTable,
  SMART_IMPORT_TABLE_UNIQUE_KEY,
  type SmartImportOptions,
} from "./smart-import.contract";

interface SmartImportConfig {
  tableName: string;
  uniqueKey: string;
  codePrefix?: string;
  fixedValues?: Record<string, unknown>;
}

export type SmartImportAudit = {
  tableName: string;
  mode: "safe" | "sync_full" | "dry_run";
  insertCount: number;
  updateCount: number;
  deactivateCount: number;
  warningCount: number;
  at: string;
};

function errSmartImport(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function formatSmartImportDbError(tableName: string, message: string) {
  if (tableName !== "mdm_nhan_su") return message;
  return formatHoSoNhanSuWriteError(message) || formatHoSoKhoaFkViolation(message) || message;
}

export async function smartImportData(
  config: SmartImportConfig,
  data: Record<string, unknown>[],
  options?: SmartImportOptions,
) {
  const softDeleteMissing = options?.softDeleteMissing === true;
  const dryRun = options?.dryRun === true;
  try {
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "File import không có dữ liệu hợp lệ." };
    }
    if (!isSmartImportTable(config.tableName)) {
      return { success: false, error: `Bảng không được phép Smart Import: ${config.tableName}` };
    }
    const expectedUniqueKey = SMART_IMPORT_TABLE_UNIQUE_KEY[config.tableName];
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
    await verifyDanhMucLookupPermission(importModule, "import");
    if (isCssdCatalogMasterTable(config.tableName)) {
      await requireCssdCatalogMasterWrite();
    }
    const supabase = createAdminSupabaseClient();
    const nhanSuDmSessionCache =
      config.tableName === "mdm_nhan_su" ? createDmImportSessionCache(supabase) : undefined;

    // Mapped views to query existing data correctly and retrieve JSONB attributes as flat fields
    const VIEW_MAP_FOR_READ: Record<string, string> = {
      cssd_dm_bo_dung_cu_chi_tiet: "v_cssd_bo_dung_cu_chi_tiet_full",
      cssd_dm_loai_dung_cu: "v_cssd_loai_dung_cu_summary",
    };
    const readTable = VIEW_MAP_FOR_READ[config.tableName] || config.tableName;
    const isLoaiDungCu = config.tableName === "cssd_dm_loai_dung_cu";
    const existingReadTable = isLoaiDungCu ? config.tableName : readTable;
    const isChiTietBom = config.tableName === "cssd_dm_bo_dung_cu_chi_tiet";
    const existingSelect = isLoaiDungCu
      ? "id, ma_loai"
      : isChiTietBom
        ? `id, ${config.uniqueKey}, bo_dung_cu_id, loai_dung_cu_id, so_luong, is_active`
        : `id, ${config.uniqueKey}`;
    const existingCodeField = isLoaiDungCu ? "ma_loai" : config.uniqueKey;

    let query = supabase.from(existingReadTable).select(existingSelect);
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
    /** Active (bo|loai) → { id, so_luong } — BOM: 1 loại / bộ. */
    const existingBoLoai = new Map<string, { id: string; so_luong: number }>();
    existingRecords.forEach((r) => {
      const val = r[existingCodeField];
      if (val != null && val !== "") {
        const cStr = isLoaiDungCu ? String(val).trim().toUpperCase() : String(val);
        if (r.id) {
          existingCodeToId.set(cStr, String(r.id));
        }
      }
      if (isChiTietBom && r.id && r.is_active !== false) {
        const bo = String(r.bo_dung_cu_id || "").trim();
        const loai = String(r.loai_dung_cu_id || "").trim();
        if (bo && loai) {
          const key = `${bo}|${loai}`;
          const prev = existingBoLoai.get(key);
          const qty = Math.max(0, Math.floor(Number(r.so_luong) || 0));
          if (!prev || qty > prev.so_luong) {
            existingBoLoai.set(key, { id: String(r.id), so_luong: qty });
          }
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
    const preparedIndexByBoLoai = new Map<string, number>();


    let counter = 1;
    if (config.codePrefix) {
      const { data: lastItem } = await supabase
        .from(existingReadTable)
        .select(existingCodeField)
        .order(existingCodeField, { ascending: false })
        .limit(1);
      if (lastItem && lastItem[0]) {
        const val = (lastItem[0] as unknown as Record<string, unknown>)[existingCodeField];
        if (val) {
          const match = String(val).match(/\d+/);
          if (match) counter = parseInt(match[0]) + 1;
        }
      }
    }

    const rowErrors: string[] = [];
    const dbErrors: string[] = [];
    const rowWarnings: string[] = [];
    for (const rawItem of data) {
      const item = isLoaiDungCu ? normalizeLoaiDungCuExcelImportRow(rawItem) : rawItem;
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
      let existingId = existingCodeToId.get(finalCode);
      let payloadId = existingId || randomUUID();
      let chiTietAddOntoQty: number | null = null;

      // BOM: upsert by (bo, loai) when active row already exists (Excel often varies ma_chi_tiet).
      if (isChiTietBom) {
        const bo = String((scopeSafeRest as Record<string, unknown>).bo_dung_cu_id || "").trim();
        const loai = String((scopeSafeRest as Record<string, unknown>).loai_dung_cu_id || "").trim();
        if (bo && loai) {
          const hit = existingBoLoai.get(`${bo}|${loai}`);
          if (hit) {
            existingId = hit.id;
            payloadId = hit.id;
            const incoming = Math.max(
              1,
              Math.floor(Number((scopeSafeRest as Record<string, unknown>).so_luong) || 1),
            );
            chiTietAddOntoQty = hit.so_luong + incoming;
            existingBoLoai.set(`${bo}|${loai}`, { id: hit.id, so_luong: chiTietAddOntoQty });
            rowWarnings.push(
              `Dòng ${rowNumber || "?"}: trùng (bộ+loại) với dòng đã có — cộng SL (${hit.so_luong}+${incoming}=${chiTietAddOntoQty}).`,
            );
          }
        }
      }

      const payload: Record<string, unknown> = {
        id: payloadId,
        [config.uniqueKey]: finalCode,
        ...scopeSafeRest,
        is_active: normalizedIsActive,
        updated_at: new Date().toISOString(),
      };
      if (chiTietAddOntoQty != null) {
        payload.so_luong = chiTietAddOntoQty;
      }

      // If hybrid JSONB table, pack the unique key into specs and delete the flat key
      const isHybrid = config.tableName in VIEW_MAP_FOR_READ;
      if (isHybrid) {
        const specs = (payload.specs as Record<string, unknown>) || {};
        specs[config.uniqueKey] = finalCode;
        payload.specs = specs;
        delete payload[config.uniqueKey];
        if (config.tableName === "cssd_dm_loai_dung_cu") {
          syncLoaiPhysicalColumnsOnImportPayload(payload, finalCode);
        }
      }

      const existingIndex = preparedIndexByCode.get(finalCode);
      if (existingIndex !== undefined) {
        preparedRows[existingIndex] = { rowNumber, code: finalCode, payload };
        rowWarnings.push(
          `Dòng ${rowNumber || "?"}: mã ${finalCode} bị trùng trong file, hệ thống dùng dữ liệu dòng xuất hiện sau.`,
        );
        continue;
      }

      if (isChiTietBom) {
        const bo = String(payload.bo_dung_cu_id || "").trim();
        const loai = String(payload.loai_dung_cu_id || "").trim();
        if (bo && loai) {
          const boLoaiKey = `${bo}|${loai}`;
          const prevIdx = preparedIndexByBoLoai.get(boLoaiKey);
          if (prevIdx !== undefined) {
            const prev = preparedRows[prevIdx]!;
            const prevQty = Math.max(0, Math.floor(Number(prev.payload.so_luong) || 0));
            const addQty = Math.max(1, Math.floor(Number(payload.so_luong) || 1));
            prev.payload.so_luong = prevQty + addQty;
            prev.rowNumber = rowNumber;
            rowWarnings.push(
              `Dòng ${rowNumber || "?"}: trùng (bộ+loại) trong file với dòng trước — cộng SL thành ${prev.payload.so_luong}.`,
            );
            continue;
          }
          preparedIndexByBoLoai.set(boLoaiKey, preparedRows.length);
        }
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

    const updateCount = preparedRows.filter((r) => existingCodeToId.has(r.code)).length;
    const insertCount = preparedRows.length - updateCount;
    const plannedCodes = new Set(preparedRows.map((r) => r.code));
    const deactivateCount = softDeleteMissing
      ? Array.from(existingCodes).filter((c) => !plannedCodes.has(c)).length
      : 0;

    const buildAudit = (mode: SmartImportAudit["mode"]): SmartImportAudit => ({
      tableName: config.tableName,
      mode,
      insertCount,
      updateCount,
      deactivateCount,
      warningCount: rowWarnings.length,
      at: new Date().toISOString(),
    });

    if (dryRun) {
      const audit = buildAudit("dry_run");
      console.info("[IMPORT_AUDIT]", JSON.stringify(audit));
      return {
        success: true,
        dryRun: true,
        audit,
        errorLines: rowWarnings.slice(0, 20),
        errorTotal: rowWarnings.length,
        warning:
          rowWarnings.length > 0
            ? `Dry-run: ${insertCount} thêm, ${updateCount} cập nhật, ${deactivateCount} sẽ ẩn. Cảnh báo: ${rowWarnings.slice(0, 3).join(" ; ")}`
            : `Dry-run: ${insertCount} thêm, ${updateCount} cập nhật, ${deactivateCount} sẽ ẩn (không ghi DB).`,
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
        audit: buildAudit(softDeleteMissing ? "sync_full" : "safe"),
      };
    }

    if (softDeleteMissing) {
      const codesToDelete = Array.from(existingCodes).filter((c) => !importedCodes.has(c));
      if (codesToDelete.length > 0) {
        const idsToDelete = codesToDelete.map((c) => existingCodeToId.get(c)).filter(Boolean) as string[];
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
    }

    const audit = buildAudit(softDeleteMissing ? "sync_full" : "safe");
    console.info("[IMPORT_AUDIT]", JSON.stringify(audit));
    revalidatePath("/quan-tri-he-thong");
    return {
      success: true,
      audit,
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
