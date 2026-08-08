/**
 * Chip cấy trên hàng SBAP / RIT của bảng phân tích (domain CDC):
 * - SBAP: cấy MÁU (+) trong cửa sổ SBAP → ứng viên Secondary BSI / ABUTI.
 * - RIT: cấy CÙNG LOẠI bệnh phẩm với Index trong DOE→DOE+13 → gộp vào ca gốc, không tạo phiếu mới.
 * Thuần logic — không I/O, không React.
 */

import type { BaGridXnCell } from "./nkbv-ba-grid-engine";
import { resolveNkbvMajorType, sameMajorType } from "./nkbv-major-type";
import { getSpecimenCanonical, isNkbvSpecimenCode } from "./nkbv-specimen-canonical";

export function isBloodSpecimen(benhPham: string | null | undefined): boolean {
  const raw = String(benhPham || "").trim();
  if (!raw) return false;
  if (isNkbvSpecimenCode(raw)) {
    return getSpecimenCanonical(raw)!.majorType === "BSI";
  }
  return /MÁU|MAU|BLOOD|HUYẾT|HUYET|BLOOD_CULTURE|BLOOD_NCT/i.test(raw);
}

/** Cùng nhóm bệnh phẩm (nước tiểu↔nước tiểu, đờm/hô hấp↔đờm...) — máu không tính. */
export function isSameSpecimenGroup(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (isBloodSpecimen(a) || isBloodSpecimen(b)) return false;
  const ga = resolveNkbvMajorType({ loai_benh_pham: a || "" });
  const gb = resolveNkbvMajorType({ loai_benh_pham: b || "" });
  return sameMajorType(ga, gb);
}

export type SbapRitChips = {
  /** date (yyyy-mm-dd) → cấy máu (+) trong cửa sổ SBAP */
  sbapByDate: Record<string, BaGridXnCell[]>;
  /** date → cấy cùng bệnh phẩm với Index trong RIT (không gồm chính Index) */
  ritByDate: Record<string, BaGridXnCell[]>;
};

export function buildSbapRitChips(input: {
  xn: BaGridXnCell[];
  indexId: string | null;
  indexSpecimen: string | null;
  ritDates: ReadonlySet<string>;
  sbapDates: ReadonlySet<string>;
}): SbapRitChips {
  const sbapByDate: Record<string, BaGridXnCell[]> = {};
  const ritByDate: Record<string, BaGridXnCell[]> = {};
  for (const x of input.xn) {
    const d = x.ngay.slice(0, 10);
    if (isBloodSpecimen(x.benh_pham)) {
      if (input.sbapDates.has(d)) (sbapByDate[d] ||= []).push(x);
      continue;
    }
    if (input.indexId && x.id === input.indexId) continue;
    if (!input.ritDates.has(d)) continue;
    if (!isSameSpecimenGroup(x.benh_pham, input.indexSpecimen)) continue;
    (ritByDate[d] ||= []).push(x);
  }
  return { sbapByDate, ritByDate };
}
