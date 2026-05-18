"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
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
    .from("fact_kho_giao_dich")
    .insert({
      ma_giao_dich: `ISS-${Date.now().toString().slice(-6)}`,
      loai_giao_dich: reason === "HONG" ? "BAO_HONG" : "BAO_MAT",
    })
    .select("id")
    .single();
  if (txErr || !tx?.id) throw new Error(mapFkError(txErr?.message || "Không tạo được giao dịch."));

  const { error: detailErr } = await supabase.from("fact_kho_chi_tiet").insert({
    giao_dich_id: tx.id,
    quy_trinh_id: quyTrinhId,
    so_luong: 1,
    ghi_chu: note || null,
  });
  if (detailErr) throw new Error(mapFkError(detailErr.message));

  const { error: updateErr } = await supabase
    .from("fact_quy_trinh")
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

  const logPayload: Record<string, unknown> = {
    ma_hanh_dong: reason === "MAT" ? "BAO_MAT" : "BAO_HONG",
    ghi_chu: `${reason === "MAT" ? "Báo mất" : "Báo hỏng"} ${maVach || quyTrinhId}. ${note}`.trim(),
  };
  if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "quy_trinh_id")) logPayload.quy_trinh_id = quyTrinhId;
  if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "ma_tram")) logPayload.ma_tram = "QC";
  const { error: logErr } = await supabase.from("fact_nhat_ky_quet").insert(logPayload);
  if (logErr) throw new Error(mapFkError(logErr.message));

  revalidateCssdWorkflowSurfaces();
  return { success: true as const };
}

export async function importCSSDData(rows: Record<string, unknown>[]) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "import");
    const { data: existing, error: exErr } = await supabase.from("fact_quy_trinh").select("id, ma_qr_quy_trinh");
    if (exErr) throw exErr;
    const existingMap = new Map(
      ((existing || []) as ExistingQrRow[])
        .filter((x) => x.ma_qr_quy_trinh)
        .map((x) => [String(x.ma_qr_quy_trinh), String(x.id || "")] as const)
    );
    const importedCodes = new Set<string>();
    const rowErrors: string[] = [];
    const dbErrors: string[] = [];
    const hasQuyTrinhIsRedAlert = await tableHasColumn(supabase, "fact_quy_trinh", "is_red_alert");
    
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
        const { error: upErr } = await supabase.from("fact_quy_trinh").update(payload).eq("id", existingMap.get(code)!);
        if (upErr) dbErrors.push(`${code}: ${mapFkError(upErr.message)}`);
      } else {
        const { error: insErr } = await supabase.from("fact_quy_trinh").insert(payload);
        if (insErr) dbErrors.push(`${code}: ${mapFkError(insErr.message)}`);
      }
      importedCodes.add(code);
    }
    const toDisable = Array.from(existingMap.keys()).filter((code) => !importedCodes.has(code));
    if (toDisable.length) {
      const { error: disErr } = await supabase
        .from("fact_quy_trinh")
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
