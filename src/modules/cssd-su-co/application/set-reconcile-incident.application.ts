import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSetReconcileDraftExpired,
  needsBomApproval,
  validateSetReconcileLines,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";
import {
  buildSetReconcileAttributePatch,
  readSetReconcileBoId,
  readSetReconcileStatus,
  type SetReconcileSnapshot,
} from "../domain/cssd-set-reconcile-attrs";
import { applySetReconcileEngravedCodes, applySetReconcilePhysicalLines } from "./set-reconcile-ledger.application";

type SuCoRow = { id: string; attributes: Record<string, unknown> | null; created_at?: string | null };

export async function loadSetReconcileIncidentsForBo(
  supabase: SupabaseClient,
  boDungCuId: string,
): Promise<SuCoRow[]> {
  const { data, error } = await supabase
    .from("cssd_fact_su_co")
    .select("id, attributes, created_at")
    .eq("is_active", true)
    .eq("incident_group", "INSTRUMENT")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  return (data || []).filter((row) => {
    const attrs = (row.attributes as Record<string, unknown>) || {};
    return readSetReconcileBoId(attrs) === boDungCuId;
  }) as SuCoRow[];
}

export function findBlockingDraft(
  rows: SuCoRow[],
  boDungCuId: string,
  reporterAuthUserId?: string | null,
): { id: string; sameUser: boolean } | null {
  for (const row of rows) {
    const attrs = row.attributes || {};
    if (readSetReconcileBoId(attrs) !== boDungCuId) continue;
    if (readSetReconcileStatus(attrs) !== "DRAFT") continue;
    if (isSetReconcileDraftExpired(String(row.created_at || ""))) continue;
    const owner = String(attrs.REPORTER_AUTH_USER_ID || "").trim();
    return { id: row.id, sameUser: Boolean(reporterAuthUserId && owner === reporterAuthUserId) };
  }
  return null;
}

export function findPendingBom(rows: SuCoRow[], boDungCuId: string): string | null {
  for (const row of rows) {
    const attrs = row.attributes || {};
    if (readSetReconcileBoId(attrs) !== boDungCuId) continue;
    if (readSetReconcileStatus(attrs) === "BOM_PENDING") return row.id;
  }
  return null;
}

export async function applySubmittedSetReconcile(
  supabase: SupabaseClient,
  suCoId: string,
  args: {
    boDungCuId: string;
    quyTrinhId?: string | null;
    maQr?: string;
    headerNote: string;
    snapshot: SetReconcileSnapshot;
    existingAttrs: Record<string, string>;
  },
): Promise<{ bomPending: boolean }> {
  const err = validateSetReconcileLines(args.snapshot.lines);
  if (err) throw new Error(err);
  const rows = await loadSetReconcileIncidentsForBo(supabase, args.boDungCuId);
  const pending = findPendingBom(rows.filter((r) => r.id !== suCoId), args.boDungCuId);
  if (pending && needsBomApproval(args.snapshot.lines)) {
    throw new Error("Bộ này đang có phiếu chờ duyệt đổi chuẩn. Duyệt hoặc từ chối phiếu đó trước khi gửi đề nghị mới.");
  }
  await applySetReconcilePhysicalLines(supabase, suCoId, {
    boDungCuId: args.boDungCuId,
    quyTrinhId: args.quyTrinhId,
    maQr: args.maQr,
    headerNote: args.headerNote,
    lines: args.snapshot.lines,
  });
  await applySetReconcileEngravedCodes(supabase, args.snapshot.lines);
  const patch = buildSetReconcileAttributePatch({
    boDungCuId: args.boDungCuId,
    snapshot: args.snapshot,
    status: "NONE",
  });
  const { error } = await supabase
    .from("cssd_fact_su_co")
    .update({ attributes: { ...args.existingAttrs, ...patch }, updated_at: new Date().toISOString() })
    .eq("id", suCoId);
  if (error) throw new Error(error.message);
  await supabase
    .from("cssd_dm_bo_dung_cu")
    .update({ ngay_kiem_ke_gan_nhat: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", args.boDungCuId);
  return { bomPending: patch.SET_RECONCILE_STATUS === "BOM_PENDING" };
}

export function catalogLinesOf(lines: SetReconcileLineInput[]): SetReconcileLineInput[] {
  return lines.filter(
    (l) => l.kind === "DOI_CHUAN" || l.kind === "DOI_LOAI" || l.kind === "THEM_DONG" || l.kind === "XOA_DONG",
  );
}
