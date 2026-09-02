import type { SupabaseClient } from "@supabase/supabase-js";
import {
  doorKindFromIncidentType,
  mapInstrumentPresetToLedgerType,
  validateInstrumentDoorLines,
  validateIssueQuantityAgainstThucTe,
  validateLayKhoQty,
  validateTraKhoQty,
} from "@/lib/domain/cssd-instrument-incident";
import {
  appendChiTietIssueNoteCore,
  insertInstrumentIssueLedgerCore,
  type InstrumentIssueType,
} from "@/lib/master-data/instrument-issue-core";
import { replenishSetInstrumentCore, returnSetInstrumentCore } from "@/lib/master-data/cssd-set-replenish-core";
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

async function readChuanAndKho(
  supabase: SupabaseClient,
  chiTietId: string,
  loaiDungCuId: string,
): Promise<{ chuan: number; kho: number }> {
  const [{ data: ct }, { data: loai }] = await Promise.all([
    supabase.from("cssd_dm_bo_dung_cu_chi_tiet").select("so_luong").eq("id", chiTietId).maybeSingle(),
    supabase.from("cssd_dm_loai_dung_cu").select("so_luong_kho_du_phong").eq("id", loaiDungCuId).maybeSingle(),
  ]);
  return {
    chuan: Math.max(0, Number((ct as { so_luong?: number } | null)?.so_luong ?? 0) || 0),
    kho: Math.max(0, Number((loai as { so_luong_kho_du_phong?: number } | null)?.so_luong_kho_du_phong ?? 0) || 0),
  };
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
  const doorErr = validateInstrumentDoorLines([
    {
      kind: doorKindFromIncidentType(payload.typeId),
      hasBomLine: Boolean(String(payload.chiTietId || "").trim() && String(payload.loaiDungCuId || "").trim()),
    },
  ]);
  if (doorErr) throw new Error(doorErr);

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

  if (!payload.chiTietId || !payload.loaiDungCuId || !payload.boDungCuId) {
    throw new Error("Thiếu dòng chi tiết / loại dụng cụ / bộ dụng cụ.");
  }

  if (ledgerType === "BO_SUNG") {
    const thucTe = await readRealtimeQty(supabase, payload.boDungCuId, payload.loaiDungCuId);
    const { chuan, kho } = await readChuanAndKho(supabase, payload.chiTietId, payload.loaiDungCuId);
    const layErr = validateLayKhoQty(qty, chuan, thucTe, kho);
    if (layErr) throw new Error(layErr);
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
    const thucTe = await readRealtimeQty(supabase, payload.boDungCuId, payload.loaiDungCuId);
    const { chuan } = await readChuanAndKho(supabase, payload.chiTietId, payload.loaiDungCuId);
    const traErr = validateTraKhoQty(qty, chuan, thucTe);
    if (traErr) throw new Error(traErr);
    const res = await returnSetInstrumentCore(supabase, {
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

  const thucTe = await readRealtimeQty(supabase, payload.boDungCuId, payload.loaiDungCuId);
  const qtyErr = validateIssueQuantityAgainstThucTe(qty, thucTe);
  if (qtyErr) throw new Error(qtyErr);

  const issueType: InstrumentIssueType = ledgerType === "BAO_HONG" ? "HONG" : "MAT";
  const noteResult = await appendChiTietIssueNoteCore(supabase, {
    chiTietId: payload.chiTietId,
    issueType,
    note,
    quantity: qty,
  });
  if (!noteResult.success) throw new Error(noteResult.error);

  const ledgerResult = await insertInstrumentIssueLedgerCore(supabase, {
    loaiDungCuId: payload.loaiDungCuId,
    issueType,
    quantity: qty,
    boDungCuId: payload.boDungCuId,
    quyTrinhId: payload.quyTrinhId,
    note,
    suCoId,
  });
  if (!ledgerResult.success) throw new Error(ledgerResult.error);
}
