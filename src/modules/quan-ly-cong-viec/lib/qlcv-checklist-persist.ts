import type { SupabaseClient } from "@supabase/supabase-js";
import type { QlcvChecklistItem } from "@/lib/domain/qlcv-checklist";
import { throwQlcvDbError } from "./qlcv-supabase-error";

export type QlcvChecklistPersistInput = {
  congViecId: string;
  items: QlcvChecklistItem[];
  phanTramHoanThanh: number;
  trangThaiMa?: string | null;
};

/** Ghi checklist qua RPC — không phụ thuộc PostgREST expose cột `checklist` trên bảng. */
export async function persistQlcvChecklistViaRpc(
  supabase: SupabaseClient,
  input: QlcvChecklistPersistInput,
): Promise<{ phan_tram_hoan_thanh: number }> {
  const { data, error } = await supabase.rpc("fn_qlcv_update_checklist", {
    p_cong_viec_id: input.congViecId,
    p_checklist: input.items,
    p_phan_tram_hoan_thanh: input.phanTramHoanThanh,
    p_trang_thai_ma: input.trangThaiMa ?? null,
  });

  if (error) throwQlcvDbError(error, "Không lưu được checklist.");

  const row = data as { phan_tram_hoan_thanh?: number } | null;
  return { phan_tram_hoan_thanh: Number(row?.phan_tram_hoan_thanh ?? input.phanTramHoanThanh) };
}
