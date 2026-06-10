"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyAnyPermission } from "@/lib/server-permission";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import {
  appendChiTietIssueNoteCore,
  insertInstrumentIssueLedgerCore,
  type InstrumentIssueType,
} from "@/lib/master-data/instrument-issue-core";

function revalidateInstrumentIssuePaths() {
  revalidatePath(quanTriDungCuHref("bo"));
  revalidatePath(quanTriDungCuHref("chi-tiet"));
  revalidatePath(quanTriDungCuHref());
  revalidatePath(CSSD_ROUTES.dungCu);
  revalidatePath(CSSD_ROUTES.quyTrinh);
}

/**
 * Báo hỏng/mất theo dòng chi tiết BOM: ghi chú audit + tách khỏi bộ + sổ giao dịch kho.
 * SSOT orchestrator — dùng chung MDM + CSSD catalog.
 */
export async function reportChiTietInstrumentIssueAction(params: {
  chiTietId: string;
  issueType: InstrumentIssueType;
  note?: string;
  quantity?: number;
  quyTrinhId?: string | null;
}) {
  await verifyAnyPermission([
    { moduleKey: "DC_LE", action: "edit" },
    { moduleKey: "CSSD_WORKFLOW", action: "edit" },
  ]);
  const supabase = await createServerSupabaseUserClient();

  const noteResult = await appendChiTietIssueNoteCore(supabase, {
    chiTietId: params.chiTietId,
    issueType: params.issueType,
    note: params.note,
  });
  if (!noteResult.success) return noteResult;

  const { snapshot } = noteResult;
  if (snapshot.loai_dung_cu_id) {
    const quantity = Math.max(1, Number(params.quantity ?? snapshot.so_luong) || 1);
    const ledgerResult = await insertInstrumentIssueLedgerCore(supabase, {
      loaiDungCuId: snapshot.loai_dung_cu_id,
      issueType: params.issueType,
      quantity,
      boDungCuId: snapshot.bo_dung_cu_id || null,
      quyTrinhId: params.quyTrinhId ?? null,
      note: params.note,
    });
    if (!ledgerResult.success) return ledgerResult;
  }

  revalidateInstrumentIssuePaths();
  return { success: true as const };
}

/** @deprecated Prefer `reportChiTietInstrumentIssueAction` — alias giữ import cũ, cùng orchestrator. */
export async function appendChiTietIssueNoteAction(params: {
  chiTietId: string;
  issueType: InstrumentIssueType;
  note?: string;
}) {
  return reportChiTietInstrumentIssueAction(params);
}
