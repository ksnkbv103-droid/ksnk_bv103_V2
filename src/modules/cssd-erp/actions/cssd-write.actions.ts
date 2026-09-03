"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { normalizeNullableFk } from "@/lib/master-data/fk-normalize";
import type { Station } from "../types/cssd.types";
import { verifyPermission } from "@/lib/server-permission";
import { buildQuyTrinhTramPatch } from "../lib/cssd-tram-persist";
import {
  getErrorMessage,
  mapFkError,
  revalidateCssdInventorySurfaces,
  revalidateCssdWorkflowSurfaces,
  STEPS,
  tableHasColumn,
  appendQuyTrinhException,
} from "./cssd-action-common";
import { cssdImportRowSchema } from "@/lib/validations/cssd-erp.validations";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";

type ExistingQrRow = { id?: string; ma_qr_quy_trinh?: string };

export async function reportInventoryIssue(input: {
  quy_trinh_id: string;
  ma_vach_qr?: string | null;
  reason: "HONG" | "MAT";
  note?: string | null;
}) {
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");
  const supabase = createAdminSupabaseClient();
  const quyTrinhId = String(input.quy_trinh_id || "").trim();
  if (!quyTrinhId) throw new Error("Thiếu quy_trinh_id.");

  const reason = input.reason === "MAT" ? "MAT" : "HONG";
  const note = String(input.note || "").trim();

  const { error: updateErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({
      tinh_trang: reason,
      is_active: reason !== "MAT",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quyTrinhId);
  if (updateErr) throw new Error(mapFkError(updateErr.message));

  let operator = "CSSD";
  try {
    const uc = await createServerSupabaseUserClient();
    const { data: userData } = await uc.auth.getUser();
    if (userData.user?.email) {
      operator = userData.user.email.trim();
    }
  } catch {
    // Fail-soft: keep "CSSD"
  }

  await appendQuyTrinhException(supabase, quyTrinhId, {
    su_kien: reason === "MAT" ? "BAO_MAT" : "BAO_HONG",
    tu_tram: "QC",
    ly_do: `${reason === "MAT" ? "Báo mất" : "Báo hỏng"}. ${note}`.trim(),
    nguoi_thao_tac: operator,
  });

  revalidateCssdWorkflowSurfaces();
  return { success: true as const };
}

export async function importCSSDData(
  rows: Record<string, unknown>[],
  options?: { softDeleteMissing?: boolean; dryRun?: boolean },
) {
  const softDeleteMissing = options?.softDeleteMissing === true;
  const dryRun = options?.dryRun === true;
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "import");
    const supabase = createAdminSupabaseClient();
    const { data: existing, error: exErr } = await supabase.from("cssd_fact_quy_trinh").select("id, ma_qr_quy_trinh");
    if (exErr) throw exErr;
    const existingMap = new Map(
      ((existing || []) as ExistingQrRow[])
        .filter((x) => x.ma_qr_quy_trinh)
        .map((x) => [String(x.ma_qr_quy_trinh).toUpperCase(), String(x.id || "")] as const)
    );
    const importedCodes = new Set<string>();
    const rowErrors: string[] = [];
    const dbErrors: string[] = [];
    let insertCount = 0;
    let updateCount = 0;
    const hasQuyTrinhIsRedAlert = dryRun
      ? false
      : await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_red_alert");

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
      const rawSta = row.trang_thai_hien_tai;
      const station: Station =
        typeof rawSta === "string" && (STEPS as readonly string[]).includes(rawSta) ? (rawSta as Station) : "TIEP_NHAN";
      const loIdRaw = String(row.lo_tiet_khuan_id || "").trim();

      if (dryRun) {
        if (loIdRaw) {
          const loNorm = await normalizeNullableFk(supabase, "lo_tiet_khuan", loIdRaw);
          if (!loNorm) {
            rowErrors.push(`Dòng ${excelRow} (${code}): mã lô tiệt khuẩn không tồn tại (${loIdRaw})`);
            continue;
          }
        }
        if (existingMap.has(code)) updateCount += 1;
        else insertCount += 1;
        importedCodes.add(code);
        continue;
      }

      const loNorm = await normalizeNullableFk(supabase, "lo_tiet_khuan", loIdRaw || null);
      if (loIdRaw && !loNorm) {
        rowErrors.push(`Dòng ${excelRow} (${code}): mã lô tiệt khuẩn không tồn tại (${loIdRaw})`);
        continue;
      }
      const tramPatch = await buildQuyTrinhTramPatch(supabase, station);
      const payload: Record<string, unknown> = {
        ma_qr_quy_trinh: code,
        ...tramPatch,
        tinh_trang: row.tinh_trang || null,
        han_su_dung: row.han_su_dung || null,
        lo_tiet_khuan_id: loNorm,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      if (hasQuyTrinhIsRedAlert) payload.is_red_alert = Boolean(row.is_red_alert);
      if (existingMap.has(code)) {
        const { error: upErr } = await supabase.from("cssd_fact_quy_trinh").update(payload).eq("id", existingMap.get(code)!);
        if (upErr) dbErrors.push(`${code}: ${mapFkError(upErr.message)}`);
        else updateCount += 1;
      } else {
        const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert(payload);
        if (insErr) dbErrors.push(`${code}: ${mapFkError(insErr.message)}`);
        else insertCount += 1;
      }
      importedCodes.add(code);
    }

    const deactivateCount = softDeleteMissing
      ? Array.from(existingMap.keys()).filter((code) => !importedCodes.has(code)).length
      : 0;

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        audit: { insertCount, updateCount, deactivateCount },
        errorLines: rowErrors.slice(0, 20),
        errorTotal: rowErrors.length,
        warning:
          rowErrors.length > 0
            ? `Dry-run kho: ${insertCount} thêm, ${updateCount} cập nhật; ${rowErrors.length} dòng lỗi.`
            : `Dry-run kho: ${insertCount} thêm, ${updateCount} cập nhật (không ghi DB).`,
      };
    }

    if (softDeleteMissing) {
      const toDisable = Array.from(existingMap.keys()).filter((code) => !importedCodes.has(code));
      if (toDisable.length) {
        const { error: disErr } = await supabase
          .from("cssd_fact_quy_trinh")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in("ma_qr_quy_trinh", toDisable);
        if (disErr) dbErrors.push(`Ẩn tem thiếu trong file: ${disErr.message}`);
      }
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
    return { success: true, audit: { insertCount, updateCount, deactivateCount } };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function recordInstrumentTransaction(input: {
  bo_dung_cu_id: string;
  loai_dung_cu_id: string;
  loai_giao_dich: "BAO_HONG" | "BAO_MAT" | "BO_SUNG" | "DIEU_CHUYEN";
  so_luong_thay_doi: number;
  ghi_chu?: string;
  quy_trinh_id?: string;
}) {
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");
  const supabase = createAdminSupabaseClient();

  let operatorId: string | null = null;
  let operatorEmail = "CSSD";
  try {
    const uc = await createServerSupabaseUserClient();
    const { data: userData } = await uc.auth.getUser();
    if (userData.user) {
      operatorEmail = userData.user.email || "CSSD";
      operatorId = await resolveCssdOperatorNhanSuId(supabase, {
        authUserId: userData.user.id,
        email: userData.user.email,
      });
    }
  } catch {
    // Fail-soft — ghi ledger với nguoi_thuc_hien_id null nếu chưa map MDM
  }

  // Phân giải quy_trinh_id sang UUID thực tế nếu truyền mã QR
  let quyTrinhUuid: string | null = null;
  if (input.quy_trinh_id) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.quy_trinh_id);
    if (isUuid) {
      quyTrinhUuid = input.quy_trinh_id;
    } else {
      const { data: qt } = await supabase
        .from("cssd_fact_quy_trinh")
        .select("id")
        .eq("ma_qr_quy_trinh", input.quy_trinh_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (qt) {
        quyTrinhUuid = qt.id;
      }
    }
  }

  // 1. Ghi nhận giao dịch vào Transaction Log
  const { error: txErr } = await supabase
    .from("cssd_fact_kho_giao_dich")
    .insert({
      loai_dung_cu_id: input.loai_dung_cu_id,
      bo_dung_cu_id: input.bo_dung_cu_id || null,
      quy_trinh_id: quyTrinhUuid,
      loai_giao_dich: input.loai_giao_dich,
      so_luong_thay_doi: input.so_luong_thay_doi,
      ghi_chu: input.ghi_chu || null,
      nguoi_thuc_hien_id: operatorId,
    });

  if (txErr) throw new Error("Lỗi ghi nhận biến động: " + txErr.message);

  // 2. Ghi chép exception quy trình nếu có liên kết quyTrinhUuid
  if (quyTrinhUuid) {
    const labelMap = {
      BAO_HONG: "Báo hỏng dụng cụ",
      BAO_MAT: "Báo mất dụng cụ",
      BO_SUNG: "Bổ sung dụng cụ rời từ kho lẻ",
      DIEU_CHUYEN: "Điều chuyển mượn từ bộ khác"
    };

    await appendQuyTrinhException(supabase, quyTrinhUuid, {
      su_kien: input.loai_giao_dich,
      tu_tram: "QC",
      ly_do: `${labelMap[input.loai_giao_dich]} (SL: ${input.so_luong_thay_doi}). ${input.ghi_chu || ""}`.trim(),
      nguoi_thao_tac: operatorEmail,
    });
  }


  revalidateCssdInventorySurfaces();
  revalidateCssdWorkflowSurfaces();
  return { success: true as const };
}

