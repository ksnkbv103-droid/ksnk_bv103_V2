"use server";

import { revalidatePath } from "next/cache";
import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { replenishSetInstrumentCore } from "@/lib/master-data/cssd-set-replenish-core";
import {
  insertInstrumentIssueLedgerCore,
  type InstrumentIssueType,
} from "@/lib/master-data/instrument-issue-core";
import { quanTriDungCuHref } from "@/lib/master-data/quan-tri-paths";

function revalidateReplenishPaths() {
  revalidatePath(quanTriDungCuHref("bo"));
  revalidatePath(quanTriDungCuHref("chi-tiet"));
  revalidatePath(quanTriDungCuHref());
}

function revalidateIssuePaths() {
  revalidateReplenishPaths();
  revalidatePath(CSSD_ROUTES.dungCu);
  revalidatePath(CSSD_ROUTES.quyTrinh);
}

/** MDM hub — bổ sung dụng cụ vào bộ từ kho dự phòng. Quyền `DC_LE.edit`, user client (RLS). */
export async function replenishSetInstrumentAction(params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const result = await replenishSetInstrumentCore(supabase, params);
  if (!result.success) return result;

  revalidateReplenishPaths();
  return { success: true as const };
}

/**
 * CSSD workflow facade — bù dụng cụ lẻ từ kho dự phòng.
 * Quyền `CSSD_WORKFLOW.edit` (không cần `DC_LE.edit`); admin client để ghi ledger khi RLS MDM chặn.
 */
export async function requestReplenishFromReserveAction(params: {
  loaiDungCuId: string;
  boDungCuId: string;
  quyTrinhId?: string | null;
  quantity?: number;
  note?: string;
}) {
  await verifyPermission("CSSD_WORKFLOW", "edit");
  const supabase = createAdminSupabaseClient();
  const result = await replenishSetInstrumentCore(supabase, {
    loaiDungCuId: params.loaiDungCuId,
    boDungCuId: params.boDungCuId,
    quyTrinhId: params.quyTrinhId,
    quantity: params.quantity ?? 1,
    note: params.note ?? "Bổ sung từ kho lẻ (facade CSSD workflow)",
  });
  if (!result.success) return result;

  revalidatePath("/cssd-quy-trinh");
  revalidatePath(quanTriDungCuHref());
  return { success: true as const };
}

/** MDM hub — báo hỏng/mất theo loại dụng cụ lẻ. Quyền `DC_LE.edit`. */
export async function reportIndividualInstrumentIssueAction(params: {
  loaiDungCuId: string;
  boDungCuId?: string | null;
  quyTrinhId?: string | null;
  issueType: InstrumentIssueType;
  quantity: number;
  note?: string;
}) {
  await verifyPermission("DC_LE", "edit");
  const supabase = await createServerSupabaseUserClient();
  const result = await insertInstrumentIssueLedgerCore(supabase, {
    loaiDungCuId: params.loaiDungCuId,
    issueType: params.issueType,
    quantity: params.quantity,
    boDungCuId: params.boDungCuId,
    quyTrinhId: params.quyTrinhId,
    note: params.note,
  });
  if (!result.success) return result;

  revalidateIssuePaths();
  return { success: true as const };
}
