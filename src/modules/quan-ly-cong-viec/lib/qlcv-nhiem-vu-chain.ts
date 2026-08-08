import type { SupabaseClient } from "@supabase/supabase-js";
import { throwQlcvDbError } from "./qlcv-supabase-error";

/** Validate nhiệm vụ active; trả về id đã chuẩn hoá. */
export async function resolveQlcvNhiemVuId(
  supabase: SupabaseClient,
  nhiemVuId: string | null | undefined,
): Promise<string | null> {
  if (!nhiemVuId) return null;
  const { data: nv, error } = await supabase
    .from("qlcv_fact_nhiem_vu")
    .select("id,is_active")
    .eq("id", nhiemVuId)
    .maybeSingle();
  if (error) throwQlcvDbError(error, "Không kiểm tra nhiệm vụ.");
  if (!nv || !nv.is_active) throw new Error("Nhiệm vụ không hợp lệ hoặc đã ngưng.");
  return String(nv.id);
}

/** @deprecated Dùng resolveQlcvNhiemVuId — giữ tên cũ cho chỗ gọi còn sót. */
async function resolveQlcvNhiemVuMocChain(
  supabase: SupabaseClient,
  nhiemVuId: string | null | undefined,
  _mocId?: string | null | undefined,
): Promise<{ nhiem_vu_id: string | null; moc_id: null; chuong_trinh_id: null }> {
  const id = await resolveQlcvNhiemVuId(supabase, nhiemVuId);
  return { nhiem_vu_id: id, moc_id: null, chuong_trinh_id: null };
}
