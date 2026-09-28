/**
 * Soft Soft Soft-safe 25d residual — picker filter theo `lop_giam_sat` / seed_meta (file 16 §6).
 * Hub VST BM.01–03 không lẫn list GSC generic (R4/R5).
 * Không invent KPI; chỉ labels/filter.
 */

import {
  isVeSinhTayGscBangKiem,
  isWhoObservationBangKiem,
  normalizeBangKiemMa,
} from "./ve-sinh-tay-catalog";

export type LopGiamSatV2 = "he_thong" | "thuc_hanh_don_vi" | "hybrid";

export type GscPickerMode = "TUAN_THU" | "NHAT_KY_VAN_HANH" | "DANH_GIA_HE_THONG" | "ALL";

export type BangKiemLopSource = {
  ma_bk?: string | null;
  loai_giam_sat?: string | null;
  ap_dung_jsonb?: unknown;
  /** Optional FE-hydrated field after normalize. */
  lop_giam_sat?: string | null;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/** Đọc `ap_dung_jsonb.seed_meta.lop_giam_sat` (25d seed) — không qua zod strip. */
export function readLopGiamSatFromBangKiem(bk: BangKiemLopSource): LopGiamSatV2 | null {
  const direct = String(bk.lop_giam_sat ?? "")
    .trim()
    .toLowerCase();
  if (direct === "he_thong" || direct === "thuc_hanh_don_vi" || direct === "hybrid") {
    return direct;
  }
  const ap = asRecord(bk.ap_dung_jsonb);
  const meta = asRecord(ap?.seed_meta);
  const lop = String(meta?.lop_giam_sat ?? "")
    .trim()
    .toLowerCase();
  if (lop === "he_thong" || lop === "thuc_hanh_don_vi" || lop === "hybrid") return lop;
  return null;
}

/**
 * Suy lớp khi tip chưa có seed_meta (pre-25d):
 * DANH_GIA_HE_THONG → he_thong; còn lại → thuc_hanh_don_vi (null nếu không suy được).
 */
export function inferLopGiamSatFallback(bk: BangKiemLopSource): LopGiamSatV2 | null {
  const fromMeta = readLopGiamSatFromBangKiem(bk);
  if (fromMeta) return fromMeta;
  const lg = String(bk.loai_giam_sat ?? "")
    .trim()
    .toUpperCase();
  if (lg === "DANH_GIA_HE_THONG") return "he_thong";
  if (lg === "TUAN_THU" || lg === "NHAT_KY_VAN_HANH" || !lg) return "thuc_hanh_don_vi";
  return null;
}

/** WHO + BM.02/BM.03 (hub VST) — không vào list GSC generic (16 §6 R4). */
export function isVstHubBangKiemExcludedFromGscGeneric(maBk: string | null | undefined): boolean {
  if (isWhoObservationBangKiem(maBk)) return true;
  if (isVeSinhTayGscBangKiem(maBk)) return true;
  const ma = normalizeBangKiemMa(maBk);
  if (!ma) return false;
  // Full seed mã QT.07 BM.02/03
  if (ma === "KSNK.QT.07.BM.02" || ma === "KSNK.QT.07.BM.03") return true;
  if (ma.endsWith("QT.07.BM.02") || ma.endsWith("QT.07.BM.03")) return true;
  return false;
}

export function filterOutVstHubFromGscGenericList<T extends { ma_bk?: string | null }>(rows: T[]): T[] {
  return rows.filter((r) => !isVstHubBangKiemExcludedFromGscGeneric(r.ma_bk));
}

/**
 * 16 §6.1–6.2 Soft Soft Soft-safe:
 * - he-thong route → chỉ he_thong
 * - tuan-thu → thuc_hanh_don_vi + hybrid; ẩn he_thong; ẩn VST hub generic
 * - nhat-ky → giữ loai_giam_sat = NHAT_KY (không đụng lop nếu chưa seed)
 */
export function filterBangKiemByLopGiamSatMode<T extends BangKiemLopSource>(
  rows: T[],
  mode?: GscPickerMode | null,
): T[] {
  const base = filterOutVstHubFromGscGenericList(rows);
  if (!mode || mode === "ALL") return base;

  if (mode === "DANH_GIA_HE_THONG") {
    return base.filter((bk) => {
      const lop = inferLopGiamSatFallback(bk);
      if (lop) return lop === "he_thong";
      return String(bk.loai_giam_sat || "").trim().toUpperCase() === "DANH_GIA_HE_THONG";
    });
  }

  if (mode === "NHAT_KY_VAN_HANH") {
    return base.filter((bk) => String(bk.loai_giam_sat || "").trim().toUpperCase() === "NHAT_KY_VAN_HANH");
  }

  // TUAN_THU = giám sát thực hành
  return base.filter((bk) => {
    const lop = inferLopGiamSatFallback(bk);
    if (lop === "he_thong") return false;
    if (lop === "thuc_hanh_don_vi" || lop === "hybrid") return true;
    const lg = String(bk.loai_giam_sat || "").trim().toUpperCase();
    return !lg || lg === "TUAN_THU";
  });
}

export const LOP_GIAM_SAT_LABELS: Record<LopGiamSatV2, string> = {
  he_thong: "Đánh giá hệ thống",
  thuc_hanh_don_vi: "Giám sát thực hành",
  hybrid: "Hybrid (thực hành + điều phối)",
};
