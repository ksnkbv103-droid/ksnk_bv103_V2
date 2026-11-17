import type { SupabaseClient } from "@supabase/supabase-js";

type Row = { loai_dung_cu_id?: string | null; bo_dung_cu_id?: string | null; so_luong_thuc_te?: number | null };

/** Cộng dồn thuần: chỉ tính dòng thuộc bộ còn hoạt động. */
export function sumTrongBoActive(rows: Row[], activeBoIds: Set<string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    const loaiId = String(r.loai_dung_cu_id || "");
    if (!loaiId || !activeBoIds.has(String(r.bo_dung_cu_id || ""))) continue;
    out.set(loaiId, (out.get(loaiId) || 0) + Number(r.so_luong_thuc_te || 0));
  }
  return out;
}

/**
 * Số "trong bộ" theo loại: dòng BOM đang hoạt động của bộ ĐANG hoạt động
 * (view realtime không lọc is_active của bộ cha).
 */
export async function fetchTrongBoByLoai(
  supabase: SupabaseClient,
  loaiIds: string[],
): Promise<{ data: Map<string, number>; error: string | null }> {
  if (!loaiIds.length) return { data: new Map(), error: null };
  const { data: lines, error } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
    .select("loai_dung_cu_id, bo_dung_cu_id, so_luong_thuc_te")
    .in("loai_dung_cu_id", loaiIds)
    .eq("is_active", true);
  if (error) return { data: new Map(), error: error.message };
  const rows = (lines || []) as Row[];
  const boIds = [...new Set(rows.map((r) => String(r.bo_dung_cu_id || "")).filter(Boolean))];
  const active = new Set<string>();
  const CHUNK = 200;
  for (let i = 0; i < boIds.length; i += CHUNK) {
    const { data: bos, error: boErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id")
      .in("id", boIds.slice(i, i + CHUNK))
      .eq("is_active", true);
    if (boErr) return { data: new Map(), error: boErr.message };
    for (const b of bos || []) active.add(String((b as { id: string }).id));
  }
  return { data: sumTrongBoActive(rows, active), error: null };
}
