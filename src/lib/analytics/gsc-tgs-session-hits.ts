import type { SupabaseClient } from "@supabase/supabase-js";
import type { TgsCoverageHit } from "./tgs-coverage-mappers";
import { getCachedGscTgsSessionHits } from "./strategic-analytics-cache";

/** Gọi RPC `rpc_gsc_tgs_session_hits` — không select VIEW summary từ app. */
export async function fetchGscTgsSessionHits(
  _supabase: SupabaseClient,
  args: { tu_ngay: string; den_ngay: string; khoa_id?: string | null },
): Promise<{ hits: TgsCoverageHit[]; sessionCountByBk: Map<string, number>; error?: string }> {
  // A) RPC mỗi lần. B) unstable_cache 90s theo kỳ/khoa — chọn B.
  const cached = await getCachedGscTgsSessionHits(args);
  if (cached.error) return { hits: [], sessionCountByBk: new Map(), error: cached.error };

  const hits: TgsCoverageHit[] = [];
  const sessionCountByBk = new Map<string, number>();
  for (const row of cached.rows) {
    const khoaId = String(row.khoa_id || "");
    const bkId = String(row.bang_kiem_id || "");
    if (!khoaId || !bkId) continue;
    hits.push({ khoa_id: khoaId, bang_kiem_id: bkId });
    sessionCountByBk.set(bkId, (sessionCountByBk.get(bkId) ?? 0) + 1);
  }
  return { hits, sessionCountByBk };
}
