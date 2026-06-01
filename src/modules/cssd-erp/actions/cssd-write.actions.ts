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
import { insertCssdLifecycleEvent } from "../shared/application/cssd-lifecycle-events";

type ExistingQrRow = { id?: string; ma_qr_quy_trinh?: string };

export async function reportInventoryIssue(input: {
  quy_trinh_id: string;
  ma_vach_qr?: string | null;
  reason: "HONG" | "MAT";
  note?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");
  const quyTrinhId = String(input.quy_trinh_id || "").trim();
  if (!quyTrinhId) throw new Error("Thiếu quy_trinh_id.");

  const reason = input.reason === "MAT" ? "MAT" : "HONG";
  const note = String(input.note || "").trim();
  const maVach = String(input.ma_vach_qr || "").trim().toUpperCase();

  const { data: tx, error: txErr } = await supabase
    .from("cssd_fact_kho_giao_dich")
    .insert({
      ma_giao_dich: `ISS-${Date.now().toString().slice(-6)}`,
      loai_giao_dich: reason === "HONG" ? "BAO_HONG" : "BAO_MAT",
    })
    .select("id")
    .single();
  if (txErr || !tx?.id) throw new Error(mapFkError(txErr?.message || "Không tạo được giao dịch."));

  const { error: detailErr } = await supabase.from("cssd_fact_kho_chi_tiet").insert({
    giao_dich_id: tx.id,
    quy_trinh_id: quyTrinhId,
    so_luong: 1,
    ghi_chu: note || null,
  });
  if (detailErr) throw new Error(mapFkError(detailErr.message));

  const { error: updateErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .update({
      tinh_trang: reason,
      is_active: reason !== "MAT",
      updated_at: new Date().toISOString(),
    })
    .eq("id", quyTrinhId);
  if (updateErr) throw new Error(mapFkError(updateErr.message));

  const lifecycle = await insertCssdLifecycleEvent(supabase, {
    quy_trinh_id: quyTrinhId,
    ma_su_kien: reason === "MAT" ? "BAO_MAT_BO_DUNG_CU" : "BAO_HONG_BO_DUNG_CU",
    ma_tram: "QC",
    ghi_chu: `${reason === "MAT" ? "Báo mất" : "Báo hỏng"} bộ dụng cụ ${maVach || ""}`.trim(),
    payload: { ma_qr_quy_trinh: maVach || null, ly_do: note || null },
  });
  if (!lifecycle.ok && !/fact_cssd_lifecycle_event|does not exist/i.test(lifecycle.message)) {
    throw new Error(lifecycle.message);
  }

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

export async function importCSSDData(rows: Record<string, unknown>[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "import");
    const { data: existing, error: exErr } = await supabase.from("cssd_fact_quy_trinh").select("id, ma_qr_quy_trinh");
    if (exErr) throw exErr;
    const existingMap = new Map(
      ((existing || []) as ExistingQrRow[])
        .filter((x) => x.ma_qr_quy_trinh)
        .map((x) => [String(x.ma_qr_quy_trinh), String(x.id || "")] as const)
    );
    const importedCodes = new Set<string>();
    const rowErrors: string[] = [];
    const dbErrors: string[] = [];
    const hasQuyTrinhIsRedAlert = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_red_alert");
    
    for (const rawRow of rows || []) {
      const parseResult = cssdImportRowSchema.safeParse(rawRow);
      if (!parseResult.success) {
        rowErrors.push(`Dòng lỗi định dạng: ${parseResult.error.message}`);
        continue;
      }
      const row = parseResult.data;
      const code = row.ma_vach_qr.toUpperCase();
      const rawSta = row.trang_thai_hien_tai;
      const station: Station =
        typeof rawSta === "string" && (STEPS as readonly string[]).includes(rawSta) ? (rawSta as Station) : "TIEP_NHAN";
      const loIdRaw = String(row.lo_tiet_khuan_id || "").trim();
      const loNorm = await normalizeNullableFk(supabase, "lo_tiet_khuan", loIdRaw || null);
      if (loIdRaw && !loNorm) {
        rowErrors.push(`${code}: lo_tiet_khuan_id khong ton tai (${loIdRaw})`);
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
      } else {
        const { error: insErr } = await supabase.from("cssd_fact_quy_trinh").insert(payload);
        if (insErr) dbErrors.push(`${code}: ${mapFkError(insErr.message)}`);
      }
      importedCodes.add(code);
    }
    const toDisable = Array.from(existingMap.keys()).filter((code) => !importedCodes.has(code));
    if (toDisable.length) {
      const { error: disErr } = await supabase
        .from("cssd_fact_quy_trinh")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("ma_qr_quy_trinh", toDisable);
      if (disErr) dbErrors.push(`soft-disable: ${disErr.message}`);
    }
    if (rowErrors.length || dbErrors.length) {
      return { success: false, error: `Import loi. Row errors: ${rowErrors.join(" | ")}. DB errors: ${dbErrors.join(" | ")}` };
    }
    revalidateCssdInventorySurfaces();
    revalidateCssdWorkflowSurfaces();
    return { success: true };
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
  const supabase = createAdminSupabaseClient();
  await verifyPermission("CSSD_KHO_DUNGCU", "edit");

  let operatorId: string | null = null;
  let operatorEmail = "CSSD";
  try {
    const uc = await createServerSupabaseUserClient();
    const { data: userData } = await uc.auth.getUser();
    if (userData.user?.id) {
      operatorId = userData.user.id;
      operatorEmail = userData.user.email || "CSSD";
    }
  } catch {
    // Fail-soft
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

export async function checkSetCompositionAndIssues(boDungCuId: string) {
  const supabase = createAdminSupabaseClient();
  const id = String(boDungCuId || "").trim();
  if (!id) return { success: false as const, error: "Thiếu mã bộ" };

  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "view");

    // 1. Kiểm tra bộ hỗn hợp chịu nhiệt
    const { data: checkHeat, error: heatErr } = await supabase.rpc("fn_cssd_check_set_heat_resistance", {
      p_bo_dung_cu_id: id
    });
    if (heatErr) throw heatErr;

    // 2. Lấy BOM chi tiết và số lượng thực tế của bộ từ view realtime
    const { data: rtList, error: rtErr } = await supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select("*")
      .eq("bo_dung_cu_id", id)
      .eq("is_active", true);
    if (rtErr) throw rtErr;

    const issues = (rtList || []).map((item) => ({
      loai_dung_cu_id: item.loai_dung_cu_id,
      ten_dung_cu: item.ten_dung_cu_le,
      so_luong_tieu_chuan: item.so_luong_tieu_chuan,
      so_luong_thuc_te: item.so_luong_thuc_te,
      is_missing: item.is_missing,
      missing_count: item.missing_count,
    }));

    const isSetMissing = issues.some((x) => x.is_missing);

    return {
      success: true as const,
      heatCheck: checkHeat as { is_hybrid: boolean; lock_steam_134: boolean; message: string },
      issues,
      is_missing: isSetMissing,
    };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : String(error) };
  }
}

