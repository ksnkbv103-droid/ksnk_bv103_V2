import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapInstrumentPresetToLedgerType,
  validateIssueQuantityAgainstThucTe,
} from "@/lib/domain/cssd-instrument-incident";
import {
  appendChiTietIssueNoteCore,
  type InstrumentIssueType,
} from "@/lib/master-data/instrument-issue-core";
import { replenishSetInstrumentCore, returnSetInstrumentToKhoCore } from "@/lib/master-data/cssd-set-replenish-core";
import { transferBomLineBetweenQuyTrinh } from "@/modules/cssd-erp/shared/application/cssd-quy-trinh-bom";

export type InstrumentIncidentPayload = {
  typeId: string;
  chiTietId?: string;
  loaiDungCuId?: string;
  boDungCuId?: string;
  quyTrinhId?: string | null;
  maQrNguon?: string;
  quantity?: number;
  maQrDen?: string;
  tenDungCuLe?: string;
  note?: string;
};

type RpcLedgerResult = { success?: boolean; message?: string };

async function readRealtimeQty(
  supabase: SupabaseClient,
  boDungCuId: string,
  loaiDungCuId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
    .select("so_luong_thuc_te")
    .eq("bo_dung_cu_id", boDungCuId)
    .eq("loai_dung_cu_id", loaiDungCuId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Math.max(0, Number((data as { so_luong_thuc_te?: number } | null)?.so_luong_thuc_te ?? 0) || 0);
}

async function applyLedgerViaRpc(
  supabase: SupabaseClient,
  params: {
    suCoId: string;
    loaiDungCuId: string;
    boDungCuId: string;
    quyTrinhId?: string | null;
    loaiGiaoDich: string;
    soLuongThayDoi: number;
    ghiChu?: string;
    boDungCuIdDen?: string;
  },
) {
  const { data, error } = await supabase.rpc("rpc_cssd_apply_instrument_ledger", {
    p_su_co_id: params.suCoId,
    p_loai_dung_cu_id: params.loaiDungCuId,
    p_bo_dung_cu_id: params.boDungCuId,
    p_quy_trinh_id: params.quyTrinhId || null,
    p_loai_giao_dich: params.loaiGiaoDich,
    p_so_luong_thay_doi: params.soLuongThayDoi,
    p_ghi_chu: params.ghiChu || null,
    p_bo_dung_cu_id_den: params.boDungCuIdDen || null,
    p_nguoi_thuc_hien_id: null,
  });
  if (error) throw new Error(error.message);
  const parsed = data as RpcLedgerResult | null;
  if (!parsed?.success) throw new Error(parsed?.message || "Không ghi sổ giao dịch dụng cụ.");
}

/** Sau khi lưu biên bản INSTRUMENT — cập nhật sổ + danh mục, không rollback quy trình. */
export async function applyInstrumentIncidentLedger(
  supabase: SupabaseClient,
  suCoId: string,
  payload: InstrumentIncidentPayload,
): Promise<void> {
  const ledgerType = mapInstrumentPresetToLedgerType(payload.typeId);
  if (!ledgerType) return;

  const qty = Math.max(1, Math.floor(Number(payload.quantity ?? 1) || 1));
  const note = String(payload.note || "").trim() || undefined;

  if (ledgerType === "DIEU_CHUYEN") {
    const maQrNguon = String(payload.maQrNguon || "").trim().toUpperCase();
    const maQrDen = String(payload.maQrDen || "").trim().toUpperCase();
    const ten = String(payload.tenDungCuLe || "").trim();
    if (!maQrNguon || !maQrDen || maQrNguon === maQrDen) {
      throw new Error("Điều chuyển cần hai QR nguồn/đích khác nhau.");
    }
    if (!ten) throw new Error("Điều chuyển cần tên dụng cụ.");
    if (!payload.loaiDungCuId || !payload.boDungCuId) {
      throw new Error("Thiếu thông tin bộ nguồn / loại dụng cụ.");
    }

    const thucTe = await readRealtimeQty(supabase, payload.boDungCuId, payload.loaiDungCuId);
    const qtyErr = validateIssueQuantityAgainstThucTe(qty, thucTe);
    if (qtyErr) throw new Error(qtyErr);

    const { data: boDen, error: boErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id")
      .eq("ma_bo", maQrDen)
      .eq("is_active", true)
      .maybeSingle();
    if (boErr) throw new Error(boErr.message);
    const boDenId = String((boDen as { id?: string } | null)?.id || "").trim();
    if (!boDenId) throw new Error("Không tìm thấy bộ đích theo QR.");

    const { data: qtTu, error: eTu } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("ma_qr_quy_trinh", maQrNguon)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: qtDen, error: eDen } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("id")
      .eq("ma_qr_quy_trinh", maQrDen)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (eTu || eDen) throw new Error((eTu || eDen)?.message || "Lỗi đọc quy trình.");
    if (qtTu && qtDen) {
      const moved = await transferBomLineBetweenQuyTrinh(supabase, {
        tuQuyTrinhId: String((qtTu as { id: string }).id),
        denQuyTrinhId: String((qtDen as { id: string }).id),
        tenDungCuLe: ten,
        soLuong: qty,
      });
      if (!moved.ok) throw new Error(moved.message);
    }

    await applyLedgerViaRpc(supabase, {
      suCoId,
      loaiDungCuId: payload.loaiDungCuId,
      boDungCuId: payload.boDungCuId,
      quyTrinhId: payload.quyTrinhId,
      loaiGiaoDich: "DIEU_CHUYEN",
      soLuongThayDoi: -qty,
      ghiChu: note,
      boDungCuIdDen: boDenId,
    });
    return;
  }

  if (ledgerType === "BO_SUNG") {
    if (!payload.loaiDungCuId || !payload.boDungCuId) {
      throw new Error("Thiếu loại dụng cụ / bộ dụng cụ.");
    }
    const res = await replenishSetInstrumentCore(supabase, {
      loaiDungCuId: payload.loaiDungCuId,
      boDungCuId: payload.boDungCuId,
      quyTrinhId: payload.quyTrinhId,
      quantity: qty,
      note,
      suCoId,
    });
    if (!res.success) throw new Error(res.error);
    return;
  }

  if (ledgerType === "NHAP_KHO") {
    if (!payload.loaiDungCuId || !payload.boDungCuId) {
      throw new Error("Thiếu loại dụng cụ / bộ dụng cụ.");
    }
    const res = await returnSetInstrumentToKhoCore(supabase, {
      loaiDungCuId: payload.loaiDungCuId,
      boDungCuId: payload.boDungCuId,
      quyTrinhId: payload.quyTrinhId,
      quantity: qty,
      note,
      suCoId,
    });
    if (!res.success) throw new Error(res.error);
    return;
  }

  if (!payload.chiTietId || !payload.loaiDungCuId || !payload.boDungCuId) {
    throw new Error("Thiếu dòng chi tiết / loại dụng cụ / bộ dụng cụ.");
  }

  const thucTe = await readRealtimeQty(supabase, payload.boDungCuId, payload.loaiDungCuId);
  const qtyErr = validateIssueQuantityAgainstThucTe(qty, thucTe);
  if (qtyErr) throw new Error(qtyErr);

  // BAO_HONG / BAO_MAT — cùng RPC SSOT với DIEU_CHUYEN (rpc_cssd_apply_instrument_ledger).
  // RPC đã check tồn thực tế; app vẫn validate trước + ghi chú chi tiết (không detach BOM).
  const issueType: InstrumentIssueType = ledgerType === "BAO_HONG" ? "HONG" : "MAT";
  const noteResult = await appendChiTietIssueNoteCore(supabase, {
    chiTietId: payload.chiTietId,
    issueType,
    note,
    quantity: qty,
  });
  if (!noteResult.success) throw new Error(noteResult.error);

  await applyLedgerViaRpc(supabase, {
    suCoId,
    loaiDungCuId: payload.loaiDungCuId,
    boDungCuId: payload.boDungCuId,
    quyTrinhId: payload.quyTrinhId,
    loaiGiaoDich: ledgerType, // BAO_HONG | BAO_MAT
    soLuongThayDoi: -qty,
    ghiChu: note,
  });
}
