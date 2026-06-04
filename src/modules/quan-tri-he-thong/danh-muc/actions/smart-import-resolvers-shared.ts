/**
 * Re-export helper thuần từ `lib/smart-import` + lookup khoa (có I/O — giữ ở actions).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
export {
  UUID_RE,
  normalizeImportMa,
  isImportMaEmpty,
  DM_TABLE_BY_LOAI,
  looksLikeShortBusinessCode,
} from "../lib/smart-import/import-ma-utils";

export async function lookupKhoaByTenFlexible(supabase: SupabaseClient, name: string) {
  const sb = supabase;
  const t = name.trim();
  if (!t) return null as { id: string } | null;
  const exact = await sb.from("mdm_dm_khoa_phong").select("id").eq("ten_khoa", t).maybeSingle();
  if (exact.error) return null;
  if (exact.data) return exact.data as { id: string };
  const esc = `%${t.replace(/%/g, "\\%")}%`;
  const like = await sb.from("mdm_dm_khoa_phong").select("id").ilike("ten_khoa", esc).limit(1).maybeSingle();
  if (!like.error && like.data) return like.data as { id: string };
  return null;
}
