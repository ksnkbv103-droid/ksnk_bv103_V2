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
import { validateIssueQuantityAgainstThucTe } from "@/lib/domain/cssd-instrument-incident";

function revalidateInstrumentIssuePaths() {
  revalidatePath(quanTriDungCuHref("bo"));
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

  const { data: rtRow, error: rtErr } = await supabase
    .from("cssd_dm_bo_dung_cu_chi_tiet")
    .select("bo_dung_cu_id, loai_dung_cu_id, so_luong")
    .eq("id", params.chiTietId)
    .maybeSingle();
  if (rtErr) return { success: false as const, error: rtErr.message };

  const boId = String((rtRow as { bo_dung_cu_id?: string } | null)?.bo_dung_cu_id || "").trim();
  const loaiId = String((rtRow as { loai_dung_cu_id?: string } | null)?.loai_dung_cu_id || "").trim();
  const soLuongChiTiet = Math.max(1, Number((rtRow as { so_luong?: number } | null)?.so_luong || 1) || 1);
  const quantity = Math.max(1, Number(params.quantity ?? soLuongChiTiet) || 1);

  if (boId && loaiId) {
    const { data: rt, error: viewErr } = await supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select("so_luong_thuc_te")
      .eq("chi_tiet_id", params.chiTietId)
      .maybeSingle();
    if (viewErr) return { success: false as const, error: viewErr.message };
    const thucTe = Math.max(0, Number((rt as { so_luong_thuc_te?: number } | null)?.so_luong_thuc_te ?? 0) || 0);
    const qtyErr = validateIssueQuantityAgainstThucTe(quantity, thucTe);
    if (qtyErr) return { success: false as const, error: qtyErr };
  }

  const noteResult = await appendChiTietIssueNoteCore(supabase, {
    chiTietId: params.chiTietId,
    issueType: params.issueType,
    note: params.note,
    quantity,
  });
  if (!noteResult.success) return noteResult;

  const { snapshot } = noteResult;
  if (snapshot.loai_dung_cu_id) {
    const ledgerResult = await insertInstrumentIssueLedgerCore(supabase, {
      loaiDungCuId: snapshot.loai_dung_cu_id,
      issueType: params.issueType,
      quantity,
      boDungCuId: snapshot.bo_dung_cu_id || boId || null,
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
