import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BangKiemPersistFields = {
  /** FK chuẩn → gstt_dm_bang_kiem.id */
  bang_kiem_id: string;
  loai_giam_sat: string;
  is_active: boolean;
  ap_dung_jsonb: unknown;
};

const BK_LOOKUP_SELECT = "id, ma_bk, loai_giam_sat, is_active, ap_dung_jsonb";

function mapLookupRow(data: {
  id: string;
  ma_bk?: string | null;
  loai_giam_sat?: string | null;
  is_active?: boolean | null;
  ap_dung_jsonb?: unknown;
}) {
  return {
    id: String(data.id),
    ma_bk: data.ma_bk ?? null,
    loai_giam_sat: data.loai_giam_sat ?? null,
    is_active: data.is_active !== false,
    ap_dung_jsonb: data.ap_dung_jsonb ?? null,
  };
}

async function lookupBangKiem(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<ReturnType<typeof mapLookupRow>> {
  const t = String(raw ?? "").trim();
  if (!t) {
    throw new Error("Thiếu loại bảng kiểm (mã hoặc UUID danh mục).");
  }
  if (UUID_RE.test(t)) {
    const { data, error } = await supabase
      .from("gstt_dm_bang_kiem")
      .select(BK_LOOKUP_SELECT)
      .eq("id", t)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) {
      throw new Error("UUID bảng kiểm không tồn tại trong danh mục (gstt_dm_bang_kiem).");
    }
    return mapLookupRow(data);
  }
  const { data, error } = await supabase
    .from("gstt_dm_bang_kiem")
    .select(BK_LOOKUP_SELECT)
    .eq("ma_bk", t)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    throw new Error(`Mã bảng kiểm "${t}" không khớp danh mục (gstt_dm_bang_kiem).`);
  }
  return mapLookupRow(data);
}

/** SSOT FK `bang_kiem_id` trên gstt_fact_chung_sessions. */
export async function resolveBangKiemPersistFields(
  supabase: SupabaseClient,
  raw: unknown,
): Promise<BangKiemPersistFields> {
  const row = await lookupBangKiem(supabase, raw);
  return {
    bang_kiem_id: row.id,
    loai_giam_sat: String(row.loai_giam_sat ?? "TUAN_THU").trim() || "TUAN_THU",
    is_active: row.is_active,
    ap_dung_jsonb: row.ap_dung_jsonb,
  };
}
