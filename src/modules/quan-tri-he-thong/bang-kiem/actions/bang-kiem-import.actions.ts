// src/modules/quan-tri-he-thong/bang-kiem/actions/bang-kiem-import.actions.ts
"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "../../actions/verify-permission";
import { normalizeBangKiemImportGroups } from "./bang-kiem-import-normalize";
import { syncBangKiemImportToDatabase } from "./bang-kiem-import-sync-db";

function errImportBk(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/**
 * importFullBangKiemData V5.0 FINAL - Đồng bộ toàn diện (Sync Hierarchy)
 * - Bảng kiểm: Có mã -> Update, Không mã -> Insert + Auto-code. Thiếu -> is_active = false (khi softDeleteMissing).
 * - Tiêu chí: Có mã -> Update, Không mã -> Insert + Auto-code. Thiếu (trong BK đó) -> is_active = false (khi softDeleteMissing).
 */
export async function importFullBangKiemData(
  groups: Record<string, unknown>[],
  options?: { softDeleteMissing?: boolean; dryRun?: boolean },
) {
  const softDeleteMissing = options?.softDeleteMissing === true;
  const dryRun = options?.dryRun === true;
  try {
    await verifyPermission("BANG_KIEM", "import");
    const supabase = createAdminSupabaseClient();
    if (!Array.isArray(groups) || groups.length === 0) {
      return { success: false, error: "Dữ liệu import rỗng. Hệ thống đã chặn để tránh làm mất dữ liệu hiện có." };
    }

    const normalized = normalizeBangKiemImportGroups(groups);
    if (!normalized.ok) return { success: false, error: normalized.error };
    const coTieuChi = normalized.groups.some((g) => (g.children?.length ?? 0) > 0);
    if (coTieuChi) await verifyPermission("BANG_KIEM_DETAIL", "import");

    if (dryRun) {
      const { data: allBKs } = await supabase.from("gstt_dm_bang_kiem").select("ma_bk, ten_bang_kiem");
      type BkLite = { ma_bk?: string | null; ten_bang_kiem?: string | null };
      const bkRows = (allBKs || []) as BkLite[];
      const existingByCode = new Map(
        bkRows.filter((b) => b.ma_bk).map((b) => [String(b.ma_bk), b] as const),
      );
      const existingByName = new Map(
        bkRows
          .filter((b) => b.ten_bang_kiem)
          .map((b) => [String(b.ten_bang_kiem).trim().toUpperCase(), b] as const),
      );
      let insertCount = 0;
      let updateCount = 0;
      const importedCodes = new Set<string>();
      for (const g of normalized.groups) {
        const ma = String(g.ma_bk || "").trim();
        const name = String(g.ten_bang_kiem || "").trim().toUpperCase();
        if (name && existingByName.has(name)) {
          updateCount += 1;
          const row = existingByName.get(name)!;
          if (row.ma_bk) importedCodes.add(String(row.ma_bk));
        } else if (ma && existingByCode.has(ma)) {
          updateCount += 1;
          importedCodes.add(ma);
        } else {
          insertCount += 1;
          if (ma) importedCodes.add(ma);
        }
      }
      const deactivateCount = softDeleteMissing
        ? Array.from(existingByCode.keys()).filter((c) => !importedCodes.has(c)).length
        : 0;
      return {
        success: true,
        dryRun: true,
        audit: { insertCount, updateCount, deactivateCount },
        warning: `Dry-run bảng kiểm: ${insertCount} thêm, ${updateCount} cập nhật${
          softDeleteMissing ? `, ${deactivateCount} sẽ ẩn nếu đồng bộ đầy đủ` : ""
        }.`,
      };
    }

    const synced = await syncBangKiemImportToDatabase(supabase, normalized.groups, { softDeleteMissing });
    if (!synced.ok) return { success: false, error: synced.error };

    revalidatePath("/quan-tri-he-thong/bang-kiem");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errImportBk(error) };
  }
}
