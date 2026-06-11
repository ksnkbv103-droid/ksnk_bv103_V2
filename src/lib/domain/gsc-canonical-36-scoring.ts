/**
 * SSOT scoring metadata — 36 mẫu `gstt_dm_bang_kiem` (cutover canonical-36).
 *
 * Nguồn đối chiếu:
 * - `docs/data/bang-kiem/canonical-36.md` (danh sách 36)
 * - `docs/data/bang-kiem/master-bangkiem.md` (Scoring_Logic → cach_tinh_diem)
 * - `docs/data/bang-kiem/giamsattuanthu.md` (engine mapping)
 *
 * Ánh xạ Scoring_Logic → `cach_tinh_diem`:
 *   PERCENTAGE → TY_LE | PASS_FAIL → DAT_KHONG_DAT | ALL_OR_NONE → TRON_GOI | LOG_ENTRY → NHAT_KY
 */

import type { GsttCachTinhDiem } from "./giam-sat-scoring";

export type GscCanonicalLoaiGiamSat = "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG";

export type GscCanonicalScoringEntry = {
  ma_bk: string;
  cach_tinh_diem: GsttCachTinhDiem;
  loai_giam_sat: GscCanonicalLoaiGiamSat;
  /** Ghi chú lệch tài liệu (nếu có) — không đổi seed tự động. */
  doc_note?: string;
};

/** 36 mẫu canonical — thứ tự theo `canonical-36.md` mục lục. */
export const GSC_CANONICAL_36_SCORING: readonly GscCanonicalScoringEntry[] = [
  { ma_bk: "BM.03.03", cach_tinh_diem: "TY_LE", loai_giam_sat: "DANH_GIA_HE_THONG" },
  { ma_bk: "BM.07.02", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.07.03", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.08.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.09.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.10.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.14.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.31.03", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.17.01", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  {
    ma_bk: "BM.15.01",
    cach_tinh_diem: "TY_LE",
    loai_giam_sat: "TUAN_THU",
    doc_note: "master-bangkiem PERCENTAGE; giamsattuanthu narrative PASS_FAIL — seed theo master",
  },
  { ma_bk: "BM.16.01", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.18.02", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.19.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  {
    ma_bk: "BM.19.02",
    cach_tinh_diem: "NHAT_KY",
    loai_giam_sat: "NHAT_KY_VAN_HANH",
    doc_note: "canonical-36 stt 14 = audit KKMĐC; seed giữ MEC log (LOG_ENTRY) — tên form khác canonical",
  },
  { ma_bk: "BM.20.02", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.22.04", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.19.03", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.21.04", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.25.01", cach_tinh_diem: "TRON_GOI", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.25.03", cach_tinh_diem: "TRON_GOI", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.27.01", cach_tinh_diem: "TRON_GOI", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.27.02", cach_tinh_diem: "TRON_GOI", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.26.01", cach_tinh_diem: "TRON_GOI", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.24.02", cach_tinh_diem: "TRON_GOI", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.11.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.12.01", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.20.01", cach_tinh_diem: "DAT_KHONG_DAT", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.13.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.12.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.08.01", cach_tinh_diem: "NHAT_KY", loai_giam_sat: "NHAT_KY_VAN_HANH" },
  { ma_bk: "BM.QĐ.02.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.03.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.09.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.17.01", cach_tinh_diem: "NHAT_KY", loai_giam_sat: "NHAT_KY_VAN_HANH" },
  { ma_bk: "BM.QĐ.16.01", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
  { ma_bk: "BM.QĐ.18.02", cach_tinh_diem: "TY_LE", loai_giam_sat: "TUAN_THU" },
] as const;

const BY_MA = new Map(GSC_CANONICAL_36_SCORING.map((e) => [e.ma_bk, e]));

export function getGscCanonicalScoring(maBk: string): GscCanonicalScoringEntry | undefined {
  return BY_MA.get(maBk.trim());
}

export function assertGscCanonical36Complete(): void {
  if (GSC_CANONICAL_36_SCORING.length !== 36) {
    throw new Error(`Expected 36 canonical templates, got ${GSC_CANONICAL_36_SCORING.length}`);
  }
  const codes = new Set(GSC_CANONICAL_36_SCORING.map((e) => e.ma_bk));
  if (codes.size !== 36) {
    throw new Error("Duplicate ma_bk in GSC_CANONICAL_36_SCORING");
  }
}

/** Tóm tắt phân bố thuật toán (audit / dashboard). */
export function summarizeGscCanonicalScoring(): Record<GsttCachTinhDiem, number> {
  const out: Record<GsttCachTinhDiem, number> = {
    TY_LE: 0,
    TRON_GOI: 0,
    DAT_KHONG_DAT: 0,
    NHAT_KY: 0,
  };
  for (const e of GSC_CANONICAL_36_SCORING) {
    out[e.cach_tinh_diem] += 1;
  }
  return out;
}
