import type { SupabaseClient } from "@supabase/supabase-js";

type RpcLedgerResult = { success?: boolean; message?: string };

async function applyReserveLedger(
  supabase: SupabaseClient,
  params: {
    loaiDungCuId: string;
    boDungCuId: string;
    quyTrinhId?: string | null;
    quantity: number;
    note?: string;
    suCoId?: string | null;
    loaiGiaoDich: "BO_SUNG" | "NHAP_KHO";
    soLuongThayDoi: number;
    fallbackNote: string;
    missingMessage: string;
    qtyMessage: string;
  },
): Promise<{ success: true } | { success: false; error: string }> {
  const loaiId = String(params.loaiDungCuId || "").trim();
  const boId = String(params.boDungCuId || "").trim();
  if (!loaiId || !boId) return { success: false, error: params.missingMessage };
  const quantity = Number(params.quantity || 1);
  if (quantity <= 0) return { success: false, error: params.qtyMessage };

  const { data, error } = await supabase.rpc("rpc_cssd_apply_instrument_ledger", {
    p_su_co_id: params.suCoId || null,
    p_loai_dung_cu_id: loaiId,
    p_bo_dung_cu_id: boId,
    p_quy_trinh_id: params.quyTrinhId || null,
    p_loai_giao_dich: params.loaiGiaoDich,
    p_so_luong_thay_doi: params.soLuongThayDoi,
    p_ghi_chu: String(params.note || "").trim() || params.fallbackNote,
    p_bo_dung_cu_id_den: null,
    p_nguoi_thuc_hien_id: null,
  });
  if (error) return { success: false, error: error.message };
  const parsed = data as RpcLedgerResult | null;
  if (!parsed?.success) return { success: false, error: parsed?.message || "Không ghi sổ giao dịch dụng cụ." };
  return { success: true };
}

/** Bổ sung dụng cụ từ kho dự phòng vào bộ. Trừ kho nằm trong RPC (không đọc-sửa-ghi). */
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
  const quantity = Number(params.quantity || 1);
  return applyReserveLedger(supabase, {
    ...params,
    quantity,
    loaiGiaoDich: "BO_SUNG",
    soLuongThayDoi: quantity,
    fallbackNote: "Bổ sung dụng cụ vào bộ từ kho dự phòng",
    missingMessage: "Thiếu id loại dụng cụ hoặc bộ dụng cụ.",
    qtyMessage: "Số lượng bổ sung phải lớn hơn 0.",
  });
}

/** Trả dụng cụ từ bộ về kho dự phòng. Cộng kho nằm trong RPC (không đọc-sửa-ghi). */
export async function returnSetInstrumentToKhoCore(
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
  const quantity = Number(params.quantity || 1);
  return applyReserveLedger(supabase, {
    ...params,
    quantity,
    loaiGiaoDich: "NHAP_KHO",
    soLuongThayDoi: -quantity,
    fallbackNote: "Trả dụng cụ từ bộ về kho dự phòng",
    missingMessage: "Thiếu id loại dụng cụ hoặc bộ dụng cụ.",
    qtyMessage: "Số lượng trả kho phải lớn hơn 0.",
  });
}
