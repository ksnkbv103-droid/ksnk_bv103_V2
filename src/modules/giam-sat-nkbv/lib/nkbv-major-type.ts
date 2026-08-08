/**
 * Major infection type for RIT (SSOT §3.4) — same major type only.
 * Ưu tiên mã bệnh phẩm chuẩn (nkbv-specimen-canonical); fallback heuristic chuỗi LIS.
 */

import {
  getSpecimenCanonical,
  isNkbvSpecimenCode,
} from "./nkbv-specimen-canonical";

export type NkbvMajorType = "BSI" | "UTI" | "PNEU" | "VAE" | "SSI" | "OTHER";

export function resolveNkbvMajorType(input: {
  loai_ma?: string | null;
  vi_tri_nhiem_khuan?: string | null;
  loai_benh_pham?: string | null;
  loai_benh_pham_chuan?: string | null;
  milestone_kind?: string | null;
}): NkbvMajorType {
  const loai = String(input.loai_ma || "")
    .trim()
    .toUpperCase();
  if (loai === "SSI") return "SSI";
  if (loai === "VAE" || loai === "VAC" || loai === "IVAC" || loai === "PVAP") return "VAE";
  if (loai === "VAP" || loai === "HAP" || loai === "PNEU" || loai.startsWith("PNU")) return "PNEU";
  if (loai === "UTI" || loai === "CAUTI" || loai === "ABUTI") return "UTI";
  if (loai === "BSI" || loai === "CLABSI" || loai === "LCBI" || loai === "MBI") return "BSI";

  const chuan = String(input.loai_benh_pham_chuan || "").trim();
  if (chuan && isNkbvSpecimenCode(chuan)) {
    return getSpecimenCanonical(chuan)!.majorType;
  }
  // Cho phép truyền mã chuẩn trực tiếp qua loai_benh_pham (effectiveSpecimenForAlgorithm).
  const bp = String(input.loai_benh_pham || "").trim();
  if (bp && isNkbvSpecimenCode(bp)) {
    return getSpecimenCanonical(bp)!.majorType;
  }

  const blob = [
    input.loai_ma,
    input.vi_tri_nhiem_khuan,
    input.loai_benh_pham,
    input.milestone_kind,
  ]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();

  if (/SSI|VẾT MỔ|VET MO|SURGICAL|WOUND|PROCEDURE_SURGERY/.test(blob)) return "SSI";
  if (/\bVAE\b/.test(blob)) return "VAE";
  if (
    /PNEU|PNU|\bVAP\b|\bHAP\b|ĐỜM|DORM|SPUTUM|ETA|BAL|PBAL|PSB|PLEURAL|URT|IMAGING_CHEST|PHỔI|PHOI|PHẾ|PHE QUAN|BRONCHIAL|X-?QUANG|LUNG/.test(
      blob,
    )
  ) {
    return "PNEU";
  }
  if (/UTI|CAUTI|ABUTI|NƯỚC TIỂU|NUOC TIEU|URINE|TIẾT NIỆU|TIET NIEU/.test(blob)) return "UTI";
  if (/BSI|CLABSI|LCBI|MBI|MÁU|MAU|BLOOD|HUYẾT|HUYET|BLOOD_CULTURE|BLOOD_NCT/.test(blob)) {
    return "BSI";
  }
  return "OTHER";
}

export function sameMajorType(a: NkbvMajorType, b: NkbvMajorType): boolean {
  if (a === "OTHER" || b === "OTHER") return false;
  return a === b;
}
