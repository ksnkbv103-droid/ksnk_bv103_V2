import type { SupabaseClient } from "@supabase/supabase-js";

/** Cập nhật trạng thái workflow qua mã TEXT + optimistic lock theo trang_thai hiện tại. */
export async function updateCongViecTrangThaiByMa(
  supabase: SupabaseClient,
  params: {
    id: string;
    currentTrangThaiMa: string | null;
    nextMa: string;
    extra?: Record<string, unknown>;
  },
): Promise<{ updated: boolean }> {
  let q = supabase
    .from("qlcv_fact_cong_viec")
    .update({
      trang_thai: params.nextMa,
      updated_at: new Date().toISOString(),
      ...params.extra,
    })
    .eq("id", params.id);
  if (params.currentTrangThaiMa) {
    q = q.eq("trang_thai", params.currentTrangThaiMa);
  }
  const { data, error } = await q.select("id").maybeSingle();
  if (error) throw error;
  return { updated: Boolean(data?.id) };
}
