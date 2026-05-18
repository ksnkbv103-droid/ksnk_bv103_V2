import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveQlcvTrangThaiId } from "./qlcv-persist-dm-fields";

/** Cập nhật trạng thái workflow qua FK + optimistic lock theo trang_thai_id hiện tại. */
export async function updateCongViecTrangThaiByMa(
  supabase: SupabaseClient,
  params: {
    id: string;
    currentTrangThaiId: string | null;
    nextMa: string;
    extra?: Record<string, unknown>;
  },
): Promise<{ updated: boolean }> {
  const nextId = await resolveQlcvTrangThaiId(supabase, params.nextMa);
  let q = supabase
    .from("fact_cong_viec")
    .update({
      trang_thai_id: nextId,
      updated_at: new Date().toISOString(),
      ...params.extra,
    })
    .eq("id", params.id);
  if (params.currentTrangThaiId) {
    q = q.eq("trang_thai_id", params.currentTrangThaiId);
  }
  const { data, error } = await q.select("id").maybeSingle();
  if (error) throw error;
  return { updated: Boolean(data?.id) };
}
