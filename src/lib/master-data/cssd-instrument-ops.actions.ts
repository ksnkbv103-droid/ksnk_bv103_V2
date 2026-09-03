"use server";

import { verifyPermission } from "@/lib/server-permission";
import { instrumentChangeRequiresIncidentResult } from "@/lib/domain/cssd-instrument-incident";
import { type InstrumentIssueType } from "@/lib/master-data/instrument-issue-core";

/** Đã đóng: biến động thành phần chỉ qua phiếu sự cố. */
export async function replenishSetInstrumentAction(_params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  return instrumentChangeRequiresIncidentResult();
}

/**
 * Đã đóng facade bù kho không phiếu — biến động chỉ qua báo cáo sự cố.
 * Vẫn kiểm `CSSD_WORKFLOW.edit` để trả lời rõ khi thiếu quyền vận hành.
 */
export async function requestReplenishFromReserveAction(_params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity?: number;
  note?: string;
}) {
  try {
    await verifyPermission("CSSD_WORKFLOW", "edit");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false as const,
      error:
        msg.includes("không có quyền") || msg.includes("chưa đăng nhập")
          ? "Không đủ quyền vận hành CSSD (sửa quy trình). Liên hệ quản trị cấp quyền «Quy trình luân chuyển QR trạm CSSD»."
          : msg,
    };
  }
  return instrumentChangeRequiresIncidentResult();
}

/** Đã đóng: báo hỏng/mất không phiếu — dùng form sự cố. */
export async function reportIndividualInstrumentIssueAction(_params: {
  loaiDungCuId: string;
  boDungCuId?: string | null;
  quyTrinhId?: string | null;
  issueType: InstrumentIssueType;
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  return instrumentChangeRequiresIncidentResult();
}
