"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import type { Station } from "../types/cssd.types";
import { revalidateCssdWorkflowSurfaces } from "./cssd-action-common";
import { executeWorkflowStationScan } from "../workflow/application/cssd-workflow-application";
import { isRejectedLegacyHexBoQr, isCssdUnifiedBoMa } from "@/lib/domain/cssd-bo-ma";
import { resolveCssdCodeWithClient } from "../shared/application/cssd-qr-hub";
import { bootstrapCssdQuyTrinhFromMaBo } from "../shared/application/cssd-bo-bootstrap";
import { verifyCssdWorkflowEdit } from "@/lib/cssd-server-gates";
import { fetchActiveQuyTrinhByScanCode } from "../shared/application/cssd-workflow-resolve";
import { resolveCssdOperatorNhanSuId } from "../shared/application/cssd-operator-resolve";
import { assertLedgerDuChoCapPhat } from "../workflow/application/cssd-asset-ledger";
// DOM-04: không auto-stamp bom_kiem_dem_at khi quét — chỉ qua rpc_cssd_persist_bom_checkpoint.

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
  await verifyCssdWorkflowEdit();
  const supabase = createAdminSupabaseClient();

  /** TK chỉ qua phiếu/mẻ (/cssd-erp/batch): không có quét «trạm tiệt khuẩn» trên luồng 6 trạm. */
  if (station === "TIET_KHUAN") {
    throw new Error(
      "Không xử lý tiệt khuẩn bằng quét tại trang này khi chưa có phiếu mẻ. Vào CSSD → Mẻ tiệt khuẩn (/cssd-erp/batch): tạo phiếu, rồi quét QR bộ trong màn hình mẻ.",
    );
  }

  const resolved = await resolveCssdCodeWithClient(supabase, maQR);
  if (isRejectedLegacyHexBoQr(resolved.code)) {
    throw new Error(
      `Mã ${resolved.code} là tem hex cũ — không còn hỗ trợ. In lại tem mã bộ (vd. B01.SET.01) từ danh mục CSSD.`,
    );
  }
  if (resolved.targetType === "MACHINE") {
    throw new Error("Mã vừa quét là mã máy. Vui lòng dùng màn Bảo trì thiết bị hoặc Mẻ tiệt khuẩn cho mã máy.");
  }
  if (resolved.targetType === "STERILIZATION_BATCH") {
    throw new Error(
      `Mã ${resolved.code} là mã mẻ tiệt khuẩn. Dùng tab Truy vết (?tab=trace) hoặc in phiếu mẻ tại danh sách mẻ — không quét tại trạm workflow.`,
    );
  }
  const code = resolved.code;
  const operatorLabel = await cssdScanOperatorLabel();

  let preQt = await fetchActiveQuyTrinhByScanCode(supabase, code);
  if (station === "TIEP_NHAN" && !preQt && isCssdUnifiedBoMa(code)) {
    await bootstrapCssdQuyTrinhFromMaBo(supabase, code);
    preQt = await fetchActiveQuyTrinhByScanCode(supabase, code);
  }
  const preRow = preQt as Record<string, unknown> | null;

  /** Bộ đã ở kho sạch (CAP_PHAT): quét lại = xác nhận cấp phát + in phiếu, ghi audit người/giờ cấp phát. */
  if (station === "CAP_PHAT" && preRow?.id && String(preRow.ma_trang_thai_hien_tai || "") === "CAP_PHAT") {
    const uc = await createServerSupabaseUserClient();
    const { data: authData } = await uc.auth.getUser();
    const operatorId = await resolveCssdOperatorNhanSuId(supabase, {
      authUserId: authData.user?.id,
      email: authData.user?.email || operatorLabel,
    });
    const nowCap = new Date().toISOString();
    const capUpdate: Record<string, unknown> = {
      thoi_gian_cap_phat: nowCap,
      updated_at: nowCap,
    };
    if (operatorId) capUpdate.nguoi_cap_phat_id = operatorId;
    if (extraPayload?.ma_ca_mo_id) {
      capUpdate.metadata = { ma_ca_mo_id: String(extraPayload.ma_ca_mo_id) };
    }
    // SSOT khoa nhận: ưu tiên payload; không có thì giữ sẵn có / bootstrap từ khoa sở hữu bộ.
    const khoaNhanPayload = String(extraPayload?.khoa_nhan_id || "").trim();
    if (khoaNhanPayload) {
      capUpdate.khoa_nhan_id = khoaNhanPayload;
    } else if (!preRow.khoa_nhan_id && preRow.bo_dung_cu_id) {
      const { data: bo } = await supabase
        .from("cssd_dm_bo_dung_cu")
        .select("khoa_su_dung_id")
        .eq("id", String(preRow.bo_dung_cu_id))
        .maybeSingle();
      const kid = String((bo as { khoa_su_dung_id?: string } | null)?.khoa_su_dung_id || "").trim();
      if (kid) capUpdate.khoa_nhan_id = kid;
    }
    await supabase.from("cssd_fact_quy_trinh").update(capUpdate).eq("id", preRow.id);
    const ledger = await assertLedgerDuChoCapPhat(supabase, String(preRow.id));
    const issuanceWarning = ledger.ok && "warning" in ledger ? ledger.warning : undefined;
    let maLoTietKhuan = "";
    const loId = String(preRow.lo_tiet_khuan_id || "").trim();
    if (loId) {
      const { data: me } = await supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("ma_lo_tiet_khuan")
        .eq("id", loId)
        .maybeSingle();
      maLoTietKhuan = String((me as { ma_lo_tiet_khuan?: string } | null)?.ma_lo_tiet_khuan || "");
    }
    revalidateCssdWorkflowSurfaces();
    return {
      success: true as const,
      maQr: code,
      tenBoDungCu: String(preRow.ten_bo || code),
      quyTrinhId: String(preRow.id),
      maLoTietKhuan,
      issuanceOnly: true as const,
      ledgerWarning: issuanceWarning,
    };
  }

  // 1. Thực hiện nghiệp vụ qua RPC tập trung (Atomicity & Speed)
  const scanExec = await executeWorkflowStationScan(supabase, {
    maQR: code,
    station,
    quyTrinh: {} as any, // quyTrinh no longer needed for primary logic
    hasDongBangColumn: true,
    operatorLabel,
    extraPayload,
  });

  revalidateCssdWorkflowSurfaces();

  const fullQt = await fetchActiveQuyTrinhByScanCode(supabase, code);
  let maLoTietKhuan = "";
  let maCycleQr: string | null = null;
  const loId = String(fullQt?.lo_tiet_khuan_id || "").trim();
  if (loId) {
    const { data: me } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("ma_lo_tiet_khuan")
      .eq("id", loId)
      .maybeSingle();
    maLoTietKhuan = String((me as { ma_lo_tiet_khuan?: string } | null)?.ma_lo_tiet_khuan || "");
  }

  if (station === "CAP_PHAT" && fullQt?.id) {
    const khoaNhanPayload = String(extraPayload?.khoa_nhan_id || "").trim();
    const patch: Record<string, unknown> = {};
    if (khoaNhanPayload) patch.khoa_nhan_id = khoaNhanPayload;
    else if (!fullQt.khoa_nhan_id && fullQt.bo_dung_cu_id) {
      const { data: bo } = await supabase
        .from("cssd_dm_bo_dung_cu")
        .select("khoa_su_dung_id")
        .eq("id", String(fullQt.bo_dung_cu_id))
        .maybeSingle();
      const kid = String((bo as { khoa_su_dung_id?: string } | null)?.khoa_su_dung_id || "").trim();
      if (kid) patch.khoa_nhan_id = kid;
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from("cssd_fact_quy_trinh").update(patch).eq("id", String(fullQt.id));
    }
  }

  if (station === "DONG_GOI" && fullQt?.id) {
    const qtId = String(fullQt.id);
    const { data: cycleRes } = await supabase.rpc("rpc_cssd_assign_cycle_qr", {
      p_quy_trinh_id: qtId,
    });
    maCycleQr = String((cycleRes as { ma_cycle_qr?: string | null } | null)?.ma_cycle_qr || "").trim() || null;

    if (!maCycleQr) {
      const { data: refreshed } = await supabase
        .from("cssd_fact_quy_trinh")
        .select("ma_cycle_qr")
        .eq("id", qtId)
        .maybeSingle();
      maCycleQr = String((refreshed as { ma_cycle_qr?: string | null } | null)?.ma_cycle_qr || "").trim() || null;
    }
  }

  return {
    success: true as const,
    maQr: code,
    tenBoDungCu: String(fullQt?.ten_bo || code),
    quyTrinhId: String(fullQt?.id || ""),
    boDungCuId: String(fullQt?.bo_dung_cu_id || ""),
    maCycleQr,
    maLoTietKhuan,
    ledgerWarning: scanExec.ledgerWarning,
  };
}
