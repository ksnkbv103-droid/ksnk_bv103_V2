import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Σ so_luong_thuc_te theo loại — chỉ dòng chi tiết active trên **bộ đang active**.
 * Không cộng bộ ngưng (tránh lệch «Trong bộ» vs danh sách bộ đang dùng).
 */
export async function sumTrongBoByLoaiIds(
  supabase: SupabaseClient,
  loaiIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = [...new Set(loaiIds.map((x) => String(x || "").trim()).filter(Boolean))];
  if (!ids.length) return out;

  const { data: setRows, error: setErr } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
    .select("loai_dung_cu_id, so_luong_thuc_te, bo_dung_cu_id")
    .in("loai_dung_cu_id", ids)
    .eq("is_active", true);
  if (setErr) throw new Error(setErr.message);

  const boIds = [
    ...new Set(
      (setRows || [])
        .map((r) => String((r as { bo_dung_cu_id?: string }).bo_dung_cu_id || "").trim())
        .filter(Boolean),
    ),
  ];
  const activeBo = new Set<string>();
  if (boIds.length) {
    const { data: bos, error: boErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id")
      .in("id", boIds)
      .eq("is_active", true);
    if (boErr) throw new Error(boErr.message);
    for (const b of bos || []) {
      const id = String((b as { id?: string }).id || "").trim();
      if (id) activeBo.add(id);
    }
  }

  for (const row of setRows || []) {
    const loaiId = String((row as { loai_dung_cu_id?: string }).loai_dung_cu_id || "").trim();
    const boId = String((row as { bo_dung_cu_id?: string }).bo_dung_cu_id || "").trim();
    if (!loaiId || !boId || !activeBo.has(boId)) continue;
    out.set(
      loaiId,
      (out.get(loaiId) || 0) + Number((row as { so_luong_thuc_te?: number }).so_luong_thuc_te || 0),
    );
  }
  return out;
}
