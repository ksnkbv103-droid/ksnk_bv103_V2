"use server";

/**
 * Façade lệnh workflow (plan): startCycle, advanceStation, rejectToPrevious, freezeSet, releaseSet.
 */
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import type { Station } from "../types/cssd.types";
import { mapFkError, revalidateCssdWorkflowSurfaces, tableHasColumn } from "./cssd-action-common";
import { scanQR } from "./cssd-scan.actions";
import {
  executeRejectToPreviousStation,
  fetchLatestActiveWorkflowByQr,
  type WorkflowQuyTrinhInput,
} from "../workflow/application/cssd-workflow-application";
import { unlockDongBangQuyTrinhByMaQr } from "./cssd-workflow-ops.actions";
import { verifyCssdInventoryEdit, verifyCssdWorkflowEdit } from "./cssd-permissions";

async function cssdOperatorLabel(): Promise<string> {
  try {
    const uc = await createServerSupabaseUserClient();
    const { data } = await uc.auth.getUser();
    return data.user?.email?.trim() || "CSSD";
  } catch {
    return "CSSD";
  }
}

/** Alias: Tiếp nhận chu kỳ mới từ Cấp phát (quét tại TIEP_NHAN). */
export async function cssdCommandStartNewCycle(maQR: string) {
  return scanQR(maQR, "TIEP_NHAN");
}

/** Bước tiếp theo theo ô trạm đang quét — cùng hành vi `scanQR`. */
export async function cssdCommandAdvanceStation(maQR: string, station: Exclude<Station, "TIET_KHUAN">) {
  return scanQR(maQR, station as Station);
}

/** Trả lui đúng 1 trạm (không dùng tại TK/CP). */
export async function cssdCommandRejectToPrevious(maQR: string, lyDo: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdWorkflowEdit();
  const code = String(maQR || "").trim().toUpperCase();
  const row = await fetchLatestActiveWorkflowByQr(supabase, code);
  if (!row) throw new Error("Không tìm thấy QR quy trình.");
  const hasDong = await tableHasColumn(supabase, "fact_quy_trinh", "is_dong_bang");
  const op = await cssdOperatorLabel();
  await executeRejectToPreviousStation(supabase, {
    maQR: code,
    quyTrinh: row as WorkflowQuyTrinhInput,
    hasDongBangColumn: hasDong,
    lyDo,
    operatorLabel: op,
  });
  revalidateCssdWorkflowSurfaces();
  return { success: true as const };
}

/** Đóng băng thủ công (thiết bị kẹt / chờ QA). */
export async function cssdCommandFreezeSet(maQR: string, lyDo?: string) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdWorkflowEdit();
  const has = await tableHasColumn(supabase, "fact_quy_trinh", "is_dong_bang");
  if (!has) throw new Error("Phiên bản DB chưa có cột khóa an toàn.");

  const code = String(maQR || "").trim().toUpperCase();
  const row = await fetchLatestActiveWorkflowByQr(supabase, code);
  if (!row) throw new Error("Không tìm thấy QR.");

  const { error } = await supabase
    .from("fact_quy_trinh")
    .update({ is_dong_bang: true, updated_at: new Date().toISOString() })
    .eq("id", String((row as { id?: string }).id));
  if (error) throw new Error(mapFkError(error.message));

  const nk: Record<string, unknown> = {
    ma_hanh_dong: "DONG_BANG_THU_CONG",
    ghi_chu: `Khóa an toàn thủ công. ${String(lyDo || "").trim().slice(0, 280)}`,
  };
  const id = String((row as { id?: string }).id || "");
  if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "quy_trinh_id")) nk.quy_trinh_id = id;
  if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "ma_tram"))
    nk.ma_tram = String((row as { ma_trang_thai_hien_tai?: string }).ma_trang_thai_hien_tai || "QC");
  const { error: nkErr } = await supabase.from("fact_nhat_ky_quet").insert(nk);
  if (nkErr) throw new Error(mapFkError(nkErr.message));

  revalidateCssdWorkflowSurfaces();
  return { success: true as const };
}

/** Mở khóa đóng băng — ủy quyền kho/CSSD (thân `unlockDongBangQuyTrinhByMaQr`). */
export async function cssdCommandReleaseSet(maQR: string) {
  await verifyCssdInventoryEdit();
  return unlockDongBangQuyTrinhByMaQr(maQR);
}
