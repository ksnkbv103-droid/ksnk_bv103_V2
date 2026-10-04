import type { SupabaseClient } from "@supabase/supabase-js";
import { mapInstrumentPresetToLedgerType } from "@/lib/domain/cssd-instrument-incident";

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

export type CssdLedgerLine = {
  loai_dung_cu_id?: string;
  bo_dung_cu_id?: string;
  quy_trinh_id?: string | null;
  loai_giao_dich?: string;
  so_luong_thay_doi?: number;
  ghi_chu?: string | null;
  bo_dung_cu_id_den?: string | null;
  chi_tiet_id?: string | null;
  issue_type?: "HONG" | "MAT" | null;
  ten_dung_cu_le?: string | null;
  ma_qr_nguon?: string | null;
  ma_qr_den?: string | null;
  ma_khac?: string | null;
  ma_khac_goc?: string | null;
  skip_ledger?: boolean;
};

type RpcLedgerResult = {
  success?: boolean;
  message?: string;
  su_co_id?: string;
  idempotent?: boolean;
};

export type SuCoCommitPayload = {
  ma_qr_quy_trinh?: string | null;
  ma_tram_phat_hien: string;
  mo_ta?: string | null;
  is_red_alert?: boolean;
  ma_tram_gay_loi?: string | null;
  attributes?: Record<string, string>;
  quy_trinh_id?: string | null;
  loai_su_co_id?: string | null;
  nguoi_bao_id?: string | null;
};

function assertRpcOk(data: unknown, error: { message: string } | null, fallback: string): RpcLedgerResult {
  if (error) throw new Error(error.message);
  const parsed = (data ?? null) as RpcLedgerResult | null;
  if (!parsed?.success) throw new Error(parsed?.message || fallback);
  return parsed;
}

/** Một dòng sổ từ payload sự cố dụng cụ. null = không có biến động sổ. */
export function prepareInstrumentLedgerLine(payload: InstrumentIncidentPayload): CssdLedgerLine | null {
  const ledgerType = mapInstrumentPresetToLedgerType(payload.typeId);
  if (!ledgerType) return null;

  const qty = Math.max(1, Math.floor(Number(payload.quantity ?? 1) || 1));
  const note = String(payload.note || "").trim() || null;
  if (!payload.loaiDungCuId || !payload.boDungCuId) {
    throw new Error(
      ledgerType === "DIEU_CHUYEN"
        ? "Thiếu thông tin bộ nguồn / loại dụng cụ."
        : "Thiếu loại dụng cụ / bộ dụng cụ.",
    );
  }

  if (ledgerType === "DIEU_CHUYEN") {
    const maQrNguon = String(payload.maQrNguon || "").trim().toUpperCase();
    const maQrDen = String(payload.maQrDen || "").trim().toUpperCase();
    const ten = String(payload.tenDungCuLe || "").trim();
    if (!maQrNguon || !maQrDen || maQrNguon === maQrDen) {
      throw new Error("Điều chuyển cần hai QR nguồn/đích khác nhau.");
    }
    if (!ten) throw new Error("Điều chuyển cần tên dụng cụ.");
    return {
      loai_dung_cu_id: payload.loaiDungCuId,
      bo_dung_cu_id: payload.boDungCuId,
      quy_trinh_id: payload.quyTrinhId || null,
      loai_giao_dich: "DIEU_CHUYEN",
      so_luong_thay_doi: -qty,
      ghi_chu: note,
      ten_dung_cu_le: ten,
      ma_qr_nguon: maQrNguon,
      ma_qr_den: maQrDen,
    };
  }

  if (ledgerType === "BAO_HONG" || ledgerType === "BAO_MAT") {
    if (!payload.chiTietId) throw new Error("Thiếu dòng chi tiết / loại dụng cụ / bộ dụng cụ.");
    return {
      loai_dung_cu_id: payload.loaiDungCuId,
      bo_dung_cu_id: payload.boDungCuId,
      quy_trinh_id: payload.quyTrinhId || null,
      loai_giao_dich: ledgerType,
      so_luong_thay_doi: -qty,
      ghi_chu: note,
      chi_tiet_id: payload.chiTietId,
      issue_type: ledgerType === "BAO_HONG" ? "HONG" : "MAT",
    };
  }

  return {
    loai_dung_cu_id: payload.loaiDungCuId,
    bo_dung_cu_id: payload.boDungCuId,
    quy_trinh_id: payload.quyTrinhId || null,
    loai_giao_dich: ledgerType,
    so_luong_thay_doi: ledgerType === "BO_SUNG" ? qty : -qty,
    ghi_chu: note,
  };
}

export async function applyInstrumentLinesRpc(
  supabase: SupabaseClient,
  args: {
    suCoId: string;
    lines: CssdLedgerLine[];
    boDungCuId?: string | null;
    touchNgayKiemKe?: boolean;
    attributes?: Record<string, string> | null;
    nguoiThucHienId?: string | null;
  },
): Promise<RpcLedgerResult> {
  const { data, error } = await supabase.rpc("rpc_cssd_apply_instrument_lines", {
    p_lines: args.lines,
    p_su_co_id: args.suCoId,
    p_bo_dung_cu_id: args.boDungCuId || null,
    p_touch_ngay_kiem_ke: Boolean(args.touchNgayKiemKe),
    p_attributes: args.attributes ?? null,
    p_nguoi_thuc_hien_id: args.nguoiThucHienId || null,
  });
  return assertRpcOk(data, error, "Không ghi sổ giao dịch dụng cụ.");
}

/** Insert/xác nhận phiếu + sổ + metadata + ghi chú trong một transaction Postgres. */
export async function commitInstrumentReportRpc(
  supabase: SupabaseClient,
  args: {
    draftId?: string | null;
    suCo: SuCoCommitPayload;
    lines: CssdLedgerLine[];
    boDungCuId?: string | null;
    touchNgayKiemKe?: boolean;
    nguoiThucHienId?: string | null;
  },
): Promise<RpcLedgerResult> {
  const { data, error } = await supabase.rpc("rpc_cssd_commit_instrument_report", {
    p_draft_id: args.draftId || null,
    p_su_co: args.suCo,
    p_lines: args.lines,
    p_bo_dung_cu_id: args.boDungCuId || null,
    p_touch_ngay_kiem_ke: Boolean(args.touchNgayKiemKe),
    p_nguoi_thuc_hien_id: args.nguoiThucHienId || null,
  });
  const parsed = assertRpcOk(data, error, "Không lưu được phiếu sự cố.");
  if (!parsed.su_co_id) throw new Error("Không lưu được phiếu sự cố.");
  return parsed;
}

/** Sau khi đã có phiếu — ghi sổ atomic (ghi chú, metadata điều chuyển, dòng ledger). */
export async function applyInstrumentIncidentLedger(
  supabase: SupabaseClient,
  suCoId: string,
  payload: InstrumentIncidentPayload,
): Promise<void> {
  const line = prepareInstrumentLedgerLine(payload);
  if (!line) return;
  await applyInstrumentLinesRpc(supabase, {
    suCoId,
    lines: [line],
    boDungCuId: payload.boDungCuId,
    touchNgayKiemKe: false,
  });
}
