"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import { verifyPermission } from "@/lib/server-permission";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import {
  getErrorMessage,
  mapFkError,
  revalidateCssdInventorySurfaces,
  revalidateCssdWorkflowSurfaces,
  appendQuyTrinhException,
} from "./cssd-action-common";
import { cssdImportRowSchema } from "@/lib/validations/cssd-erp.validations";
import { resolvePackConditionWrite } from "@/lib/domain/cssd-pack-issuance";
import {
  countCssdKhoImportDeactivations,
  rejectCssdKhoImportSoftDelete,
} from "../lib/cssd-kho-import-policy";

type ExistingQrRow = { id?: string; ma_qr_quy_trinh?: string };

/**
 * Ghi tình trạng bao gói trước CAP_PHAT (QT.22) — Bình thường / ướt / rách / bẩn.
 * S-E W5: Hỏng / Mất bộ đi một cửa Báo sự cố CSSD; hàm này không đổi is_active, không trừ tồn.
 */
export async function recordPackCondition(input: {
  quy_trinh_id: string;
  tinh_trang: string;
  note?: string | null;
}) {
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");
  const supabase = createAdminSupabaseClient();
  const quyTrinhId = String(input.quy_trinh_id || "").trim();
  if (!quyTrinhId) throw new Error("Thiếu quy_trinh_id.");

  const write = resolvePackConditionWrite(input.tinh_trang);
  if (!write.ok) throw new Error(write.message);
  const tinh = write.tinh_trang;
  const note = String(input.note || "").trim();

  const { data: updated, error: updateErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({ tinh_trang: tinh, updated_at: new Date().toISOString() })
    .eq("id", quyTrinhId)
    .eq("is_active", true)
    .select("id");
  if (updateErr) throw new Error(mapFkError(updateErr.message));
  if (!updated?.length) throw new Error("Không tìm thấy quy trình đang hoạt động để ghi tình trạng gói.");

  let operator = "CSSD";
  try {
    const uc = await createServerSupabaseUserClient();
    const { data: userData } = await uc.auth.getUser();
    if (userData.user?.email) {
      operator = userData.user.email.trim();
    }
  } catch {
    // Fail-soft
  }

  await appendQuyTrinhException(supabase, quyTrinhId, {
    su_kien: "GHI_TINH_TRANG_GOI",
    tu_tram: "CAP_PHAT",
    ly_do: `Tình trạng gói: ${tinh}.${note ? ` ${note}` : ""}`.trim(),
    nguoi_thao_tac: operator,
  });

  revalidateCssdWorkflowSurfaces();
  revalidateCssdInventorySurfaces();
  return { success: true as const, tinh_trang: tinh };
}

/**
 * Nạp Excel kho CHỈ tạo shell: mã QR mới ở TIEP_NHAN, chưa mẻ/HSD/cờ đỏ/tình trạng.
 * Mã đã có (đang hoạt động) bị bỏ qua, không cập nhật; cột trạm/lô/HSD/cờ đỏ trong file bị bỏ qua.
 * Bộ «vô khuẩn» chỉ đi qua quy trình mẻ thật (CS-IMP, giả định chờ PO).
 */
export async function importCSSDData(
  rows: Record<string, unknown>[],
  options?: { softDeleteMissing?: boolean; dryRun?: boolean },
) {
  const softDeleteRequested = options?.softDeleteMissing === true;
  /** Fact vận hành: luôn safe — không soft-delete tem thiếu trong file. */
  const softDeleteMissing = false;
  const dryRun = options?.dryRun === true;
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "import");
    const softDeleteBlock = rejectCssdKhoImportSoftDelete(softDeleteRequested);
    if (softDeleteBlock) {
      return { success: false as const, error: softDeleteBlock };
    }
    const supabase = createAdminSupabaseClient();
    // S-E W4: chỉ cập nhật chu kỳ active — đọc hết trang (hết cắt 1000 → insert trùng).
    const existing = await fetchAllRangeRows<ExistingQrRow>((from, to) =>
      supabase
        .from("cssd_fact_quy_trinh")
        .select("id, ma_qr_quy_trinh")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .range(from, to),
    );
    const existingMap = new Map(
      existing
        .filter((x) => x.ma_qr_quy_trinh)
        .map((x) => [String(x.ma_qr_quy_trinh).toUpperCase(), String(x.id || "")] as const)
    );
    const importedCodes = new Set<string>();
    const rowErrors: string[] = [];
    const dbErrors: string[] = [];
    let insertCount = 0;
    let skipCount = 0;
    let ignoredFieldRows = 0;

    for (const rawRow of rows || []) {
      const excelRow = Number(rawRow.__excel_row__) || "?";
      // Excel UI dùng ma_vach_qr; chấp nhận alias ma_qr_quy_trinh từ file cũ.
      const normalizedRow = {
        ...rawRow,
        ma_vach_qr: rawRow.ma_vach_qr ?? rawRow.ma_qr_quy_trinh,
        trang_thai_hien_tai: rawRow.trang_thai_hien_tai ?? rawRow.ma_trang_thai_hien_tai,
      };
      const parseResult = cssdImportRowSchema.safeParse(normalizedRow);
      if (!parseResult.success) {
        const detail = parseResult.error.issues.map((i) => i.message).join("; ") || "định dạng không hợp lệ";
        rowErrors.push(`Dòng ${excelRow}: ${detail}`);
        continue;
      }
      const row = parseResult.data;
      const code = row.ma_vach_qr.toUpperCase();
      const hasIgnoredField = [
        row.trang_thai_hien_tai,
        row.tinh_trang,
        row.han_su_dung,
        row.lo_tiet_khuan_id,
        row.is_red_alert,
      ].some((v) => v !== undefined && v !== null && String(v).trim() !== "" && v !== false);
      if (hasIgnoredField) ignoredFieldRows += 1;

      if (existingMap.has(code) || importedCodes.has(code)) {
        skipCount += 1;
        importedCodes.add(code);
        continue;
      }
      importedCodes.add(code);
      if (dryRun) {
        insertCount += 1;
        continue;
      }

      const tramPatch = await buildQuyTrinhTramPatch(supabase, "TIEP_NHAN");
      const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert({
        ma_qr_quy_trinh: code,
        ...tramPatch,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
      if (insErr) dbErrors.push(`${code}: ${mapFkError(insErr.message)}`);
      else insertCount += 1;
    }

    const deactivateCount = countCssdKhoImportDeactivations(
      existingMap.keys(),
      importedCodes,
      softDeleteMissing,
    );

    const shellNote =
      `Chỉ tạo shell: ${skipCount} mã đã có bị bỏ qua` +
      (ignoredFieldRows ? `; ${ignoredFieldRows} dòng có cột trạm/lô/HSD/tình trạng/cờ đỏ bị bỏ qua` : "") +
      ".";

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        audit: { insertCount, updateCount: 0, skipCount, ignoredFieldRows, deactivateCount },
        errorLines: rowErrors.slice(0, 20),
        errorTotal: rowErrors.length,
        warning:
          rowErrors.length > 0
            ? `Dry-run kho: ${insertCount} shell mới; ${rowErrors.length} dòng lỗi. ${shellNote}`
            : `Dry-run kho: ${insertCount} shell mới (không ghi DB). ${shellNote}`,
      };
    }

    if (rowErrors.length || dbErrors.length) {
      return {
        success: false,
        error: `Nạp kho lỗi. Dòng: ${rowErrors.join(" | ") || "—"}. Ghi DB: ${dbErrors.join(" | ") || "—"}`,
        errorLines: rowErrors.slice(0, 20),
        errorTotal: rowErrors.length,
      };
    }
    revalidateCssdInventorySurfaces();
    revalidateCssdWorkflowSurfaces();
    return {
      success: true,
      audit: { insertCount, updateCount: 0, skipCount, ignoredFieldRows, deactivateCount },
      warning: skipCount || ignoredFieldRows ? shellNote : undefined,
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
