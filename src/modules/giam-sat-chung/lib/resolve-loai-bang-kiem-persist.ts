import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Chuẩn hóa giá trị lưu `fact_giam_sat_chung_sessions.loai_bang_kiem` để khớp dashboard / RPC:
 * ưu tiên `ma_bk` (nếu có), không thì UUID `dm_bang_kiem.id`.
 */
export async function resolveCanonicalLoaiBangKiemForPersist(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<string> {
  const t = String(raw ?? "").trim();
  if (!t) {
    throw new Error("Thiếu loại bảng kiểm (mã hoặc UUID danh mục).");
  }
  if (UUID_RE.test(t)) {
    const { data, error } = await supabase.from("dm_bang_kiem").select("id, ma_bk").eq("id", t).maybeSingle();
    if (error) throw error;
    if (!data?.id) {
      throw new Error("UUID bảng kiểm không tồn tại trong danh mục (dm_bang_kiem).");
    }
    const ma = String(data.ma_bk ?? "").trim();
    return ma || String(data.id);
  }
  const { data, error } = await supabase.from("dm_bang_kiem").select("id, ma_bk").eq("ma_bk", t).maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(`Mã bảng kiểm "${t}" không khớp danh mục (dm_bang_kiem).`);
  }
  const ma = String(data.ma_bk ?? "").trim();
  return ma || String(data.id);
}
