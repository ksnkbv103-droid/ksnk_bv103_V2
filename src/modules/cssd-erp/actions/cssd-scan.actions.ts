"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import type { Station } from "../types/cssd.types";
import { revalidateCssdWorkflowSurfaces } from "./cssd-action-common";
import { executeWorkflowStationScan } from "../workflow/application/cssd-workflow-application";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { verifyCssdWorkflowEdit } from "./cssd-permissions";

async function cssdScanOperatorLabel(): Promise<string> {
  try {
    const uc = await createServerSupabaseUserClient();
    const { data } = await uc.auth.getUser();
    const email = data.user?.email?.trim();
    if (email) return email;
    return "CSSD";
  } catch {
    return "CSSD";
  }
}


export async function scanQR(maQR: string, station: Station, extraPayload?: Record<string, any>) {
  const supabase = createAdminSupabaseClient();
  await verifyCssdWorkflowEdit();

  /** TK chỉ qua phiếu/mẻ (/cssd-erp/batch): không có quét «trạm tiệt khuẩn» trên luồng 6 trạm. */
  if (station === "TIET_KHUAN") {
    throw new Error(
      "Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào CSSD → Mẻ tiệt khuẩn (/cssd-erp/batch): tạo phiếu, rồi quét QR bộ trong màn hình mẻ.",
    );
  }

  const resolved = await resolveCssdCodeWithClient(supabase, maQR);
  if (resolved.targetType === "MACHINE") {
    throw new Error("Mã vừa quét là mã máy. Vui lòng dùng màn Bảo trì thiết bị hoặc Mẻ tiệt khuẩn cho mã máy.");
  }
  const code = resolved.code;
  const operatorLabel = await cssdScanOperatorLabel();

  // 1. Thực hiện nghiệp vụ qua RPC tập trung (Atomicity & Speed)
  await executeWorkflowStationScan(supabase, {
    maQR: code,
    station,
    quyTrinh: {} as any, // quyTrinh no longer needed for primary logic
    hasDongBangColumn: true,
    operatorLabel,
    extraPayload,
  });

  revalidateCssdWorkflowSurfaces();

  // 2. Lấy tên bộ từ View phẳng để hiển thị (Performance)
  const { data: viewRow } = await supabase
    .from("v_fact_quy_trinh_full")
    .select("ten_bo")
    .eq("ma_qr_quy_trinh", code)
    .maybeSingle();

  return { success: true as const, tenBoDungCu: (viewRow as any)?.ten_bo || code };
}
