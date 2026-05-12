import type { SupabaseClient } from "@supabase/supabase-js";
import { UUID_RE } from "./smart-import-resolvers-shared";

export async function resolveBoDungCuIdForImport(
  supabase: SupabaseClient,
  row: Record<string, unknown>,
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; error: string }> {
  const sb = supabase;
  const out = { ...row };
  const boRaw = String(out.bo_dung_cu_id || "").trim();
  const maBo = String((out.ma_bo_cha ?? out.ma_bo ?? "") || "").trim().toUpperCase();
  const tenBo = String((out.ten_bo_cha ?? out.ten_bo ?? "") || "").trim();
  if (!boRaw && !maBo && !tenBo) return { ok: true, row: { ...out, bo_dung_cu_id: null } };
  if (boRaw && UUID_RE.test(boRaw)) return { ok: true, row: { ...out, bo_dung_cu_id: boRaw } };

  let ref: { id: string } | null = null;
  const maLookup = boRaw && !UUID_RE.test(boRaw) ? boRaw.toUpperCase() : maBo;
  if (maLookup) {
    const { data, error } = await sb
      .from("dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo")
      .eq("ma_bo", maLookup)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string } | null;
  }
  if (!ref && tenBo) {
    const { data, error } = await sb
      .from("dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo")
      .eq("ten_bo", tenBo)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    ref = data as { id: string } | null;
  }
  if (!ref) {
    const autoMa = (maLookup || tenBo || boRaw || "").trim().toUpperCase();
    if (!autoMa)
      return { ok: false, error: `Không tìm thấy bộ cha từ bo_dung_cu_id/ma_bo_cha/ten_bo_cha (${boRaw || maBo || tenBo}).` };
    const { data: created, error } = await sb
      .from("dm_bo_dung_cu")
      .insert([{ ma_bo: autoMa, ten_bo: `Bộ ${autoMa}`, trang_thai: "ACTIVE", is_active: true }])
      .select("id, ma_bo, ten_bo")
      .single();
    if (error) return { ok: false, error: `Không tạo được bộ cha ${autoMa}: ${error.message}` };
    ref = created as { id: string };
  }
  out.bo_dung_cu_id = ref.id;
  return { ok: true, row: out };
}
