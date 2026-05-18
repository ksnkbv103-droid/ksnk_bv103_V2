import type { SupabaseClient } from "@supabase/supabase-js";

/** Đọc mã workflow từ FK (sau migration bỏ cột text trên fact_cong_viec). */
export async function resolveQlcvWorkflowMaFromIds(
  supabase: SupabaseClient,
  row: { trang_thai_id?: string | null; loai_cong_viec_id?: string | null },
): Promise<{ trang_thai: string | null; loai_cong_viec: string | null }> {
  const [ts, lc] = await Promise.all([
    row.trang_thai_id
      ? supabase.from("dm_trang_thai_cong_viec").select("ma").eq("id", row.trang_thai_id).maybeSingle()
      : Promise.resolve({ data: null }),
    row.loai_cong_viec_id
      ? supabase.from("dm_loai_cong_viec").select("ma").eq("id", row.loai_cong_viec_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    trang_thai: ts.data?.ma != null ? String(ts.data.ma) : null,
    loai_cong_viec: lc.data?.ma != null ? String(lc.data.ma) : null,
  };
}

/** Hàng từ view v_fact_cong_viec_full đã có alias trang_thai / loai_cong_viec. */
export function qlcvWorkflowMaFromViewRow(row: {
  trang_thai?: string | null;
  loai_cong_viec?: string | null;
}): { trang_thai: string; loai_cong_viec: string | null } {
  return {
    trang_thai: String(row.trang_thai ?? "").trim(),
    loai_cong_viec: row.loai_cong_viec != null ? String(row.loai_cong_viec).trim() : null,
  };
}
