import type { SupabaseClient } from "@supabase/supabase-js";

let tramIdByMaCache: Map<string, string> | null = null;

async function loadTramMap(supabase: SupabaseClient): Promise<Map<string, string>> {
  if (tramIdByMaCache) return tramIdByMaCache;
  const { data, error } = await supabase.from("cssd_dm_tram").select("id, ma_tram").eq("is_active", true);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data || []) {
    const ma = String((row as { ma_tram?: string }).ma_tram || "").trim().toUpperCase();
    const id = String((row as { id?: string }).id || "").trim();
    if (ma && id) map.set(ma, id);
  }
  tramIdByMaCache = map;
  return map;
}
export async function resolveCssdTramId(
  supabase: SupabaseClient,
  maTram: string,
): Promise<string | null> {
  const ma = String(maTram || "").trim().toUpperCase();
  if (!ma) return null;
  const map = await loadTramMap(supabase);
  return map.get(ma) ?? null;
}
/** Patch ghi fact_quy_trinh — SSOT tram_hien_tai_id. */
export async function buildQuyTrinhTramPatch(
  supabase: SupabaseClient,
  maTram: string,
): Promise<{ tram_hien_tai_id: string }> {
  const id = await resolveCssdTramId(supabase, maTram);
  if (!id) throw new Error(`Trạm CSSD không hợp lệ: ${maTram}`);
  return { tram_hien_tai_id: id };
}
