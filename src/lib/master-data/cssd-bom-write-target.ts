import type { SupabaseClient } from "@supabase/supabase-js";

const VAI_TRO_TACH = new Set(["CHIU_NHIET", "KHONG_CHIU_NHIET"]);

/**
 * BOM chỉ ghi trên bộ tổng. Bộ con tách nhiệt (parent_bo_id ≠ null và vai_tro_tach là CN/KCN)
 * → quy về bộ cha; bộ thường hoặc không đọc được → giữ nguyên id.
 */
export async function resolveBoTongIdForBomWrite(
  supabase: SupabaseClient,
  boId: string,
): Promise<string> {
  const id = String(boId || "").trim();
  if (!id) return id;
  const { data, error } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("parent_bo_id, vai_tro_tach")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { parent_bo_id?: string | null; vai_tro_tach?: string | null } | null;
  const parent = String(row?.parent_bo_id || "").trim();
  if (parent && VAI_TRO_TACH.has(String(row?.vai_tro_tach || ""))) return parent;
  return id;
}
