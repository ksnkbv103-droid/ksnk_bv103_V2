/**
 * Helpers for «chưa phân tích» BA filter.
 * List ưu tiên RPC `fn_nkbv_ba_keys_chua_phan_tich`; scan FE là fallback khi RPC chưa migrate.
 */

import { countChuaPhanTich } from "./nkbv-vi-sinh-analysis-status";

export const CHUA_PT_VI_SINH_SCAN_CAP = 1500 as const;
/** Chunk size if caller still pages BA keys into PostgREST `.in`. */
export const CHUA_PT_BA_CHUNK = 80 as const;

export type ViSinhPosScanRow = {
  id?: string | null;
  ma_benh_an?: string | null;
  ket_qua_phan_loai?: string | null;
  ket_qua_duong_tinh?: boolean | null;
  tac_nhan?: string | null;
  metadata?: unknown;
};

/** Same positive rule as listNkbvMedicalRecords / SQL v_nkbv_vi_sinh_chua_phan_tich. */
export function isPositiveViSinhRow(r: ViSinhPosScanRow): boolean {
  const pl = String(r.ket_qua_phan_loai || "").toUpperCase();
  if (pl === "AM_TINH") return false;
  if (pl === "DUONG_TINH" || r.ket_qua_duong_tinh === true) return true;
  return Boolean(r.tac_nhan) && pl !== "AM_TINH";
}

export function chunkStrings(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

/** Normalize RPC / view result into distinct non-empty BA keys. */
export function normalizeChuaPhanTichBaKeys(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const ba = String(x ?? "").trim();
    if (!ba || seen.has(ba)) continue;
    seen.add(ba);
    out.push(ba);
  }
  return out;
}

export type ChuaPtScanCaseRow = {
  verification_data?: unknown;
  is_active?: boolean | null;
};

function dispositionFromVd(
  vd: Record<string, unknown>,
): "BO_QUA" | "KHONG_DU_TC" | "DA_PHAN_TICH" | null {
  const d = vd.analysis_disposition;
  if (d === "BO_QUA" || d === "KHONG_DU_TC" || d === "DA_PHAN_TICH") return d;
  return null;
}

/** Fallback khi RPC chưa có: quét XN (+) ∩ phiếu/metadata đã xử lý. */
export function collectChuaPhanTichBaKeysFromScan(input: {
  viSinhRows: ViSinhPosScanRow[];
  caseRows: ChuaPtScanCaseRow[];
}): string[] {
  const positives = input.viSinhRows.filter(isPositiveViSinhRow);
  const dispositions: Array<{
    index_vi_sinh_id?: string | null;
    analysis_disposition?: "BO_QUA" | "KHONG_DU_TC" | "DA_PHAN_TICH" | null;
    is_active?: boolean | null;
  }> = [];

  for (const c of input.caseRows) {
    if (c.is_active === false) continue;
    const vd =
      c.verification_data && typeof c.verification_data === "object"
        ? (c.verification_data as Record<string, unknown>)
        : {};
    dispositions.push({
      index_vi_sinh_id: vd.index_vi_sinh_id ? String(vd.index_vi_sinh_id) : null,
      analysis_disposition: dispositionFromVd(vd),
      is_active: true,
    });
  }
  for (const r of positives) {
    const meta =
      r.metadata && typeof r.metadata === "object"
        ? (r.metadata as Record<string, unknown>)
        : {};
    if (meta.analysis_disposition === "BO_QUA" && r.id) {
      dispositions.push({
        index_vi_sinh_id: String(r.id),
        analysis_disposition: "BO_QUA",
        is_active: true,
      });
    }
  }

  const byBa = new Map<string, string[]>();
  for (const r of positives) {
    const ba = String(r.ma_benh_an || "").trim();
    if (!ba || !r.id) continue;
    const arr = byBa.get(ba) || [];
    arr.push(String(r.id));
    byBa.set(ba, arr);
  }
  const out: string[] = [];
  for (const [ba, ids] of byBa) {
    if (countChuaPhanTich(ids, dispositions) > 0) out.push(ba);
  }
  return out;
}
