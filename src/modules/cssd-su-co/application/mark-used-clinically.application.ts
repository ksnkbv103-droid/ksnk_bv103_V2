import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildClearUsedClinicallyMetadataPatch,
  buildUsedClinicallyMetadataPatch,
  type CssdUsedClinicallySource,
  parseUsedClinicallyFromMetadata,
} from "../domain/cssd-used-clinically";

export type MarkUsedClinicallyArgs = {
  quyTrinhId: string;
  actor: string;
  source: CssdUsedClinicallySource;
  maCaMoId?: string | null;
  at?: string | null;
  /** Manual fallback only — clear used when event was mistaken. */
  clear?: boolean;
};

/**
 * Ghi nhận used_clinically qua sự kiện tường minh (actor + timestamp).
 * Dùng rpc_cssd_quy_trinh_metadata_merge — không silent trên print CAP_PHAT.
 */
export async function markCssdUsedClinically(
  supabase: SupabaseClient,
  args: MarkUsedClinicallyArgs,
): Promise<{ usedClinically: boolean; state: ReturnType<typeof parseUsedClinicallyFromMetadata> }> {
  const id = String(args.quyTrinhId || "").trim();
  const actor = String(args.actor || "").trim();
  if (!id) throw new Error("Thiếu mã quy trình.");
  if (!actor) throw new Error("Thiếu actor khi ghi nhận used_clinically.");

  const { data: row, error: readErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("id, metadata, is_active")
    .eq("id", id)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!row) throw new Error("Không tìm thấy quy trình.");
  if ((row as { is_active?: boolean }).is_active !== true) {
    throw new Error("Chu trình đã đóng — không ghi nhận used_clinically.");
  }

  const patch = args.clear
    ? buildClearUsedClinicallyMetadataPatch({ actor, at: args.at })
    : buildUsedClinicallyMetadataPatch({
        actor,
        at: args.at,
        source: args.source,
        maCaMoId: args.maCaMoId,
      });

  const { error } = await supabase.rpc("rpc_cssd_quy_trinh_metadata_merge", {
    p_id: id,
    p_patch: patch,
  });
  if (error) {
    // Fallback when ME merge RPC chưa apply: merge client-side (thin Soft-local).
    const meta = ((row as { metadata?: Record<string, unknown> }).metadata || {}) as Record<
      string,
      unknown
    >;
    const { error: upErr } = await supabase
      .from("cssd_fact_quy_trinh")
      .update({ metadata: { ...meta, ...patch } })
      .eq("id", id);
    if (upErr) throw new Error(upErr.message);
  }

  const { data: after, error: afterErr } = await supabase
    .from("cssd_fact_quy_trinh")
    .select("metadata")
    .eq("id", id)
    .maybeSingle();
  if (afterErr) throw new Error(afterErr.message);
  const state = parseUsedClinicallyFromMetadata(
    (after as { metadata?: unknown } | null)?.metadata,
  );
  return { usedClinically: state.usedClinically === true && !!state.usedClinicallyAt && !!state.usedClinicallyBy, state };
}
