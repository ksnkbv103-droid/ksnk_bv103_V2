import type { SupabaseClient } from "@supabase/supabase-js";

/** Lấy dụng cụ từ kho dự phòng vào bộ khi loại đã có dòng chuẩn (ledger `cssd_fact_kho_giao_dich`). Caller phải verify quyền. */
export async function replenishSetInstrumentCore(
  supabase: SupabaseClient,
  params: {
    loaiDungCuId: string;
    boDungCuId: string;
    quyTrinhId?: string | null;
    quantity: number;
    note?: string;
    suCoId?: string | null;
  },
) {
  const loaiId = String(params.loaiDungCuId || "").trim();
  const boId = String(params.boDungCuId || "").trim();
  if (!loaiId || !boId) return { success: false as const, error: "Thiếu id loại dụng cụ hoặc bộ dụng cụ." };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false as const, error: "Số lượng bổ sung phải lớn hơn 0." };

  const { data: loai, error: getErr } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .select("so_luong_kho_du_phong")
    .eq("id", loaiId)
    .maybeSingle();
  if (getErr) return { success: false as const, error: getErr.message };
  const reserve = Number((loai as { so_luong_kho_du_phong?: number | null } | null)?.so_luong_kho_du_phong || 0);
  if (reserve < quantity) {
    return { success: false as const, error: `Số lượng dự phòng không đủ (hiện có ${reserve} dụng cụ).` };
  }

  const { error: decErr } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .update({
      so_luong_kho_du_phong: reserve - quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", loaiId);
  if (decErr) return { success: false as const, error: decErr.message };

  const { error: insErr } = await supabase.from("cssd_fact_kho_giao_dich").insert({
    loai_dung_cu_id: loaiId,
    bo_dung_cu_id: boId,
    quy_trinh_id: params.quyTrinhId || null,
    loai_giao_dich: "BO_SUNG",
    so_luong_thay_doi: quantity,
    ghi_chu: String(params.note || "").trim() || "Lấy từ kho cho đủ chuẩn (kho dự phòng → bộ)",
    su_co_id: params.suCoId || null,
    updated_at: new Date().toISOString(),
  });
  if (insErr) return { success: false as const, error: insErr.message };

  return { success: true as const };
}

/** Trả dụng cụ từ bộ về kho dự phòng (sổ `NHAP_KHO`). Caller phải verify quyền. */
export async function returnSetInstrumentCore(
  supabase: SupabaseClient,
  params: {
    loaiDungCuId: string;
    boDungCuId: string;
    quyTrinhId?: string | null;
    quantity: number;
    note?: string;
    suCoId?: string | null;
  },
) {
  const loaiId = String(params.loaiDungCuId || "").trim();
  const boId = String(params.boDungCuId || "").trim();
  if (!loaiId || !boId) return { success: false as const, error: "Thiếu id loại dụng cụ hoặc bộ dụng cụ." };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false as const, error: "Số lượng trả kho phải lớn hơn 0." };

  const { data: loai, error: getErr } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .select("so_luong_kho_du_phong")
    .eq("id", loaiId)
    .maybeSingle();
  if (getErr) return { success: false as const, error: getErr.message };
  const reserve = Number((loai as { so_luong_kho_du_phong?: number | null } | null)?.so_luong_kho_du_phong || 0);

  const { error: incErr } = await supabase
    .from("cssd_dm_loai_dung_cu")
    .update({
      so_luong_kho_du_phong: reserve + quantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", loaiId);
  if (incErr) return { success: false as const, error: incErr.message };

  const { error: insErr } = await supabase.from("cssd_fact_kho_giao_dich").insert({
    loai_dung_cu_id: loaiId,
    bo_dung_cu_id: boId,
    quy_trinh_id: params.quyTrinhId || null,
    loai_giao_dich: "NHAP_KHO",
    so_luong_thay_doi: -quantity,
    ghi_chu: String(params.note || "").trim() || "Trả phần thừa từ bộ về kho dự phòng",
    su_co_id: params.suCoId || null,
    updated_at: new Date().toISOString(),
  });
  if (insErr) return { success: false as const, error: insErr.message };

  return { success: true as const };
}
