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
 * - Bảng kiểm: Có mã -> Update, Không mã -> Insert + Auto-code. Thiếu -> is_active = false.
 * - Tiêu chí: Có mã -> Update, Không mã -> Insert + Auto-code. Thiếu (trong BK đó) -> is_active = false.
 */
export async function importFullBangKiemData(groups: Record<string, unknown>[]) {
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

    const synced = await syncBangKiemImportToDatabase(supabase, normalized.groups);
    if (!synced.ok) return { success: false, error: synced.error };

    revalidatePath("/quan-tri-he-thong/bang-kiem");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: errImportBk(error) };
  }
}
