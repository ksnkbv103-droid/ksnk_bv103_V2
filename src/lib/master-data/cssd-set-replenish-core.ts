import type { SupabaseClient } from "@supabase/supabase-js";

/** Bổ sung dụng cụ từ kho dự phòng vào bộ (ledger `fact_kho_dung_cu_giao_dich`). Caller phải verify quyền. */
export async function replenishSetInstrumentCore(
  supabase: SupabaseClient,
  params: {
    loaiDungCuId: string;
    boDungCuId: string;
    quyTrinhId?: string | null;
    quantity: number;
    note?: string;
  },
) {
  const loaiId = String(params.loaiDungCuId || "").trim();
  const boId = String(params.boDungCuId || "").trim();
  if (!loaiId || !boId) return { success: false as const, error: "Thiếu id loại dụng cụ hoặc bộ dụng cụ." };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false as const, error: "Số lượng bổ sung phải lớn hơn 0." };

  const { data: loai, error: getErr } = await supabase
    .from("dm_loai_dung_cu")
    .select("so_luong_kho_du_phong")
    .eq("id", loaiId)
    .maybeSingle();
  if (getErr) return { success: false as const, error: getErr.message };
  const reserve = Number((loai as { so_luong_kho_du_phong?: number | null } | null)?.so_luong_kho_du_phong || 0);
  if (reserve < quantity) {
    return { success: false as const, error: `Số lượng dự phòng không đủ (hiện có ${reserve} dụng cụ).` };
  }

  const { error: decErr } = await supabase
    .from("dm_loai_dung_cu")
    .update({
      so_luong_kho_du_phong: reserve - quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", loaiId);
  if (decErr) return { success: false as const, error: decErr.message };

  const { error: insErr } = await supabase.from("fact_kho_dung_cu_giao_dich").insert({
    loai_dung_cu_id: loaiId,
    bo_dung_cu_id: boId,
    quy_trinh_id: params.quyTrinhId || null,
    loai_giao_dich: "BO_SUNG",
    so_luong_thay_doi: quantity,
    ghi_chu: String(params.note || "").trim() || "Bổ sung dụng cụ vào bộ từ kho dự phòng",
    updated_at: new Date().toISOString(),
  });
  if (insErr) return { success: false as const, error: insErr.message };

  return { success: true as const };
}
