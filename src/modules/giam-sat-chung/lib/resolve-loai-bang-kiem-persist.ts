import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BangKiemPersistFields = {
  /** FK chuẩn → dm_bang_kiem.id */
  bang_kiem_id: string;
  loai_giam_sat: string;
};

async function lookupBangKiem(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<{ id: string; ma_bk: string | null; loai_giam_sat: string | null }> {
  const t = String(raw ?? "").trim();
  if (!t) {
    throw new Error("Thiếu loại bảng kiểm (mã hoặc UUID danh mục).");
  }
  if (UUID_RE.test(t)) {
    const { data, error } = await supabase
      .from("dm_bang_kiem")
      .select("id, ma_bk, loai_giam_sat")
      .eq("id", t)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) {
      throw new Error("UUID bảng kiểm không tồn tại trong danh mục (dm_bang_kiem).");
    }
    return {
      id: String(data.id),
      ma_bk: data.ma_bk ?? null,
      loai_giam_sat: data.loai_giam_sat ?? null,
    };
  }
  const { data, error } = await supabase
    .from("dm_bang_kiem")
    .select("id, ma_bk, loai_giam_sat")
    .eq("ma_bk", t)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(`Mã bảng kiểm "${t}" không khớp danh mục (dm_bang_kiem).`);
  }
  return {
    id: String(data.id),
    ma_bk: data.ma_bk ?? null,
    loai_giam_sat: data.loai_giam_sat ?? null,
  };
}

/** Mã bảng kiểm (đọc từ view / dm) — không còn cột text trên phiên GSC. */
export async function resolveCanonicalLoaiBangKiemForPersist(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<string> {
  const row = await lookupBangKiem(supabase, raw);
  const ma = String(row.ma_bk ?? "").trim();
  return ma || row.id;
}

/** SSOT FK `bang_kiem_id` trên fact_giam_sat_chung_sessions. */
export async function resolveBangKiemPersistFields(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<BangKiemPersistFields> {
  const row = await lookupBangKiem(supabase, raw);
  return {
    bang_kiem_id: row.id,
    loai_giam_sat: String(row.loai_giam_sat ?? "TUAN_THU").trim() || "TUAN_THU",
  };
}
