import type { SupabaseClient } from "@supabase/supabase-js";

/** Gán FK danh mục QLCV khi insert/update — SSOT trên fact_cong_viec.*_id. */

export type QlcvDmPersistFields = {
  loai_cong_viec_id: string | null;
  trang_thai_id: string | null;
};

export async function resolveQlcvLoaiCongViecId(
  supabase: SupabaseClient,
  maLoai: string,
): Promise<string | null> {
  const ma = String(maLoai || "").trim();
  if (!ma) return null;
  const { data } = await supabase.from("dm_loai_cong_viec").select("id").eq("ma", ma).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function resolveQlcvTrangThaiId(
  supabase: SupabaseClient,
  maTrangThai: string,
): Promise<string | null> {
  const ma = String(maTrangThai || "").trim();
  if (!ma) return null;
  const { data } = await supabase.from("dm_trang_thai_cong_viec").select("id").eq("ma", ma).maybeSingle();
  return data?.id ? String(data.id) : null;
}

export async function buildQlcvDmPersistFields(
  supabase: SupabaseClient,
  params: { loai_cong_viec?: string | null; trang_thai?: string | null },
): Promise<QlcvDmPersistFields> {
  const [loai_cong_viec_id, trang_thai_id] = await Promise.all([
    resolveQlcvLoaiCongViecId(supabase, params.loai_cong_viec ?? ""),
    resolveQlcvTrangThaiId(supabase, params.trang_thai ?? ""),
  ]);
  return { loai_cong_viec_id, trang_thai_id };
}
