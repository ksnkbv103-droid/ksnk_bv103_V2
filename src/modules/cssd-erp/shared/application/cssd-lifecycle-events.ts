import type { SupabaseClient } from "@supabase/supabase-js";

export async function insertCssdLifecycleEvent(
  supabase: SupabaseClient,
  p: {
    quy_trinh_id: string;
    ma_su_kien: string;
    ma_tram?: string | null;
    ghi_chu?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("fact_cssd_lifecycle_event").insert({
    quy_trinh_id: p.quy_trinh_id,
    ma_su_kien: p.ma_su_kien,
    ma_tram: p.ma_tram ?? null,
    ghi_chu: p.ghi_chu ?? null,
    payload: p.payload ?? {},
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message || "Lỗi ghi lifecycle event." };
  return { ok: true };
}
