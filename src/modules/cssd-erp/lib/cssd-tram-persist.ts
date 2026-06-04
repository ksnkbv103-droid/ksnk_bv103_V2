import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "../types/cssd.types";

const TRAM_MA_ORDER: Station[] = ["TIEP_NHAN", "LAM_SACH", "QC", "DONG_GOI", "TIET_KHUAN", "CAP_PHAT"];

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

function invalidateCssdTramCache() {
  tramIdByMaCache = null;
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

async function resolveCssdTramMa(
  supabase: SupabaseClient,
  tramId: string | null | undefined,
): Promise<Station | null> {
  const id = String(tramId || "").trim();
  if (!id) return null;
  const { data, error } = await supabase.from("cssd_dm_tram").select("ma_tram").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  const ma = String((data as { ma_tram?: string } | null)?.ma_tram || "").trim().toUpperCase();
  return TRAM_MA_ORDER.includes(ma as Station) ? (ma as Station) : null;
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
