"use server";

import { revalidatePath } from "next/cache";
import { genericDmMustUseDedicatedPageError } from "@/lib/master-data/danh-muc-admin-routes";
import { verifyDanhMucLookupPermission } from "@/lib/master-data/danh-muc-lookup-permission";
import { getRegistryEntryOrNull } from "@/lib/master-data/domain-registry";
import { resolveDanhMucViewModuleByType } from "@/lib/master-data/danh-muc-permission-map";
import { buildMigratedUpsertPayload } from "@/lib/master-data/danh-muc-routing";
import { listMasterRows, softDeleteManyMasterRows, upsertMasterRow } from "./master-crud-core";

function permModule(loaiDanhMuc: string): string {
  const key = loaiDanhMuc.trim();
  if (key === "VAI_TRO_HE_THONG_KSNK") return "PHAN_QUYEN";
  return resolveDanhMucViewModuleByType(key);
}

export type GenericDmImportOptions = {
  softDeleteMissing?: boolean;
  dryRun?: boolean;
};

/** Xuất Excel lookup generic (mã / tên / is_active). */
export async function exportGenericDmExcelAction(loaiDanhMuc: string) {
  await verifyDanhMucLookupPermission(permModule(loaiDanhMuc), "view");
  const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
  if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
  const listed = await listMasterRows(reg.sourceTable, reg.maColumn);
  if (!listed.success) return listed;
  const rows = (listed.data || []).map((r: Record<string, unknown>) => ({
    [reg.maColumn]: r[reg.maColumn],
    [reg.tenColumn]: r[reg.tenColumn],
    is_active: r.is_active !== false,
  }));
  return { success: true as const, data: rows };
}

/**
 * Nạp Excel lookup generic qua upsertMasterRow (sys_lookup_value hoặc TABLE).
 * An toàn mặc định; soft-delete thiếu chỉ khi softDeleteMissing === true.
 */
export async function importGenericDmExcelAction(
  loaiDanhMuc: string,
  data: Record<string, unknown>[],
  options?: GenericDmImportOptions,
) {
  const softDeleteMissing = options?.softDeleteMissing === true;
  const dryRun = options?.dryRun === true;
  try {
    await verifyDanhMucLookupPermission(permModule(loaiDanhMuc), "import");
    const dedicatedError = genericDmMustUseDedicatedPageError(loaiDanhMuc);
    if (dedicatedError) return { success: false as const, error: dedicatedError };
    const reg = getRegistryEntryOrNull(loaiDanhMuc.trim());
    if (!reg) return { success: false as const, error: "Loại danh mục không hợp lệ." };
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false as const, error: "File import không có dữ liệu hợp lệ." };
    }

    const listed = await listMasterRows(reg.sourceTable, reg.maColumn);
    if (!listed.success) return listed;
    const existing = (listed.data || []) as Record<string, unknown>[];
    const codeToId = new Map<string, string>();
    existing.forEach((r) => {
      const code = String(r[reg.maColumn] ?? "").trim();
      if (code && r.id) codeToId.set(code, String(r.id));
    });

    const prepared: Array<{ code: string; id: string | null; ten: string; active: boolean }> = [];
    const seen = new Set<string>();
    for (const row of data) {
      const code = String(row[reg.maColumn] ?? "").trim();
      const ten = String(row[reg.tenColumn] ?? "").trim();
      if (!code || !ten) continue;
      if (seen.has(code)) continue;
      seen.add(code);
      prepared.push({
        code,
        id: codeToId.get(code) ?? null,
        ten,
        active: String(row.is_active ?? "true").toLowerCase() !== "false",
      });
    }
    if (prepared.length === 0) {
      return { success: false as const, error: "Không có dòng hợp lệ (cần mã và tên)." };
    }

    const updateCount = prepared.filter((p) => p.id).length;
    const insertCount = prepared.length - updateCount;
    const importedCodes = new Set(prepared.map((p) => p.code));
    const deactivateIds = softDeleteMissing
      ? existing
          .filter((r) => {
            const code = String(r[reg.maColumn] ?? "").trim();
            return code && !importedCodes.has(code) && r.id;
          })
          .map((r) => String(r.id))
      : [];

    const audit = {
      insertCount,
      updateCount,
      deactivateCount: deactivateIds.length,
    };

    if (dryRun) {
      console.info(
        "[IMPORT_AUDIT]",
        JSON.stringify({ tableName: reg.sourceTable, mode: "dry_run", ...audit, at: new Date().toISOString() }),
      );
      return {
        success: true as const,
        dryRun: true,
        audit,
        warning: `Dry-run: ${insertCount} thêm, ${updateCount} cập nhật, ${deactivateIds.length} sẽ ẩn.`,
      };
    }

    for (const row of prepared) {
      const payload = buildMigratedUpsertPayload(reg, {
        ma: row.code,
        ten: row.ten,
        isActive: row.active,
      });
      const res = await upsertMasterRow(reg.sourceTable, row.id || "", payload);
      if (!res.success) {
        return { success: false as const, error: res.error || `Lỗi ghi mã ${row.code}` };
      }
    }

    if (deactivateIds.length > 0) {
      const soft = await softDeleteManyMasterRows(reg.sourceTable, deactivateIds);
      if (!soft.success) {
        return { success: false as const, error: soft.error || "Không ẩn được bản ghi thiếu trong file." };
      }
    }

    console.info(
      "[IMPORT_AUDIT]",
      JSON.stringify({
        tableName: reg.sourceTable,
        mode: softDeleteMissing ? "sync_full" : "safe",
        ...audit,
        at: new Date().toISOString(),
      }),
    );
    revalidatePath("/quan-tri-he-thong");
    return { success: true as const, audit };
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}
