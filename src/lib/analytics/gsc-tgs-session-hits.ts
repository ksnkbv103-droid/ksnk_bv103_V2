import type { SupabaseClient } from "@supabase/supabase-js";
import type { TgsCoverageHit } from "./tgs-coverage-mappers";

/** Gọi RPC `rpc_gsc_tgs_session_hits` — không select VIEW summary từ app. */
export async function fetchGscTgsSessionHits(
  supabase: SupabaseClient,
  args: { tu_ngay: string; den_ngay: string; khoa_id?: string | null },
): Promise<{ hits: TgsCoverageHit[]; sessionCountByBk: Map<string, number>; error?: string }> {
  const { data, error } = await supabase.rpc("rpc_gsc_tgs_session_hits", {
    p_tu_ngay: args.tu_ngay,
    p_den_ngay: args.den_ngay,
    p_khoa_id: args.khoa_id?.trim() || null,
  });
  if (error) return { hits: [], sessionCountByBk: new Map(), error: error.message };

  const hits: TgsCoverageHit[] = [];
  const sessionCountByBk = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ khoa_id: string; bang_kiem_id: string; session_id: string }>) {
    const khoaId = String(row.khoa_id || "");
    const bkId = String(row.bang_kiem_id || "");
    if (!khoaId || !bkId) continue;
    hits.push({ khoa_id: khoaId, bang_kiem_id: bkId });
    sessionCountByBk.set(bkId, (sessionCountByBk.get(bkId) ?? 0) + 1);
  }
  return { hits, sessionCountByBk };
}
