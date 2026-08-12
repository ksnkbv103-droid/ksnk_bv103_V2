/**
 * Chip cấy trên hàng SBAP / RIT của bảng phân tích (domain CDC):
 * - SBAP: cấy MÁU (+) trong cửa sổ SBAP → ứng viên Secondary BSI / ABUTI
 *   (cờ organismMatched khi trùng VK ổ tại chỗ).
 * - RIT: cấy CÙNG LOẠI bệnh phẩm + CĐHA ∈ DOE→DOE+13 → gộp / loại khỏi SK mới.
 * Thuần logic — không I/O, không React.
 */

import type { BaGridCdhaCell, BaGridXnCell } from "./nkbv-ba-grid-engine";
import { resolveNkbvMajorType, sameMajorType } from "./nkbv-major-type";
import { getSpecimenCanonical, isNkbvSpecimenCode } from "./nkbv-specimen-canonical";
import { organismsMatchForSecondary } from "./nkbv-shared-secondary-bsi";

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

/** Specimen gợi ý theo hội chứng khi Index = CĐHA / thiếu benh_pham. */
export function specimenHintForPanel(
  panel: "UTI" | "PNEU" | "BSI" | "SSI" | "VAE" | string,
): string {
  switch (panel) {
    case "UTI":
      return "Nước tiểu";
    case "PNEU":
    case "VAE":
      return "Đờm";
    case "SSI":
      return "Dịch vết mổ";
    case "BSI":
      return "Máu";
    default:
      return "";
  }
}

export function resolveIndexSpecimenForChips(input: {
  indexXnBenhPham?: string | null;
  panel?: string | null;
  specimenHint?: string | null;
}): string | null {
  const fromXn = String(input.indexXnBenhPham || "").trim();
  if (fromXn && !isBloodSpecimen(fromXn)) return fromXn;
  const hint = String(input.specimenHint || "").trim();
  if (hint) return hint;
  const fromPanel = specimenHintForPanel(String(input.panel || ""));
  return fromPanel || null;
}

export type SbapBloodChip = BaGridXnCell & {
  /** Trùng VK với ổ tại chỗ (RIT pathogens) — ưu tiên quy kết Secondary. */
  organismMatched: boolean;
};

export type SbapRitChips = {
  /** date → cấy máu (+) trong cửa sổ SBAP */
  sbapByDate: Record<string, SbapBloodChip[]>;
  /** date → cấy cùng bệnh phẩm với Index trong RIT (không gồm chính Index) */
  ritByDate: Record<string, BaGridXnCell[]>;
  /** date → CĐHA ∈ RIT (vd. XQ phổi PNEU) — không gồm chính Index CĐHA */
  ritCdhaByDate: Record<string, BaGridCdhaCell[]>;
};

function bloodMatchesAnyPrimary(
  bloodOrganism: string | null | undefined,
  primaryOrganisms: readonly string[],
): boolean {
  const blood = String(bloodOrganism || "").trim();
  if (!blood || !primaryOrganisms.length) return false;
  return primaryOrganisms.some((p) => organismsMatchForSecondary(blood, p));
}

export function buildSbapRitChips(input: {
  xn: BaGridXnCell[];
  cdha?: BaGridCdhaCell[];
  indexId: string | null;
  /** Bệnh phẩm Index hoặc hint panel (Đờm / Nước tiểu / …). */
  indexSpecimen: string | null;
  ritDates: ReadonlySet<string>;
  sbapDates: ReadonlySet<string>;
  /** VK ổ tại chỗ (Index ∪ RIT) — gắn badge trùng trên máu SBAP. */
  primaryOrganisms?: readonly string[];
}): SbapRitChips {
  const sbapByDate: Record<string, SbapBloodChip[]> = {};
  const ritByDate: Record<string, BaGridXnCell[]> = {};
  const ritCdhaByDate: Record<string, BaGridCdhaCell[]> = {};
  const primaries = input.primaryOrganisms || [];

  for (const x of input.xn) {
    const d = x.ngay.slice(0, 10);
    if (isBloodSpecimen(x.benh_pham)) {
      if (input.sbapDates.has(d)) {
        (sbapByDate[d] ||= []).push({
          ...x,
          organismMatched: bloodMatchesAnyPrimary(x.vi_khuan, primaries),
        });
      }
      continue;
    }
    if (input.indexId && x.id === input.indexId) continue;
    if (!input.ritDates.has(d)) continue;
    if (!isSameSpecimenGroup(x.benh_pham, input.indexSpecimen)) continue;
    (ritByDate[d] ||= []).push(x);
  }

  for (const c of input.cdha || []) {
    const d = c.ngay.slice(0, 10);
    if (input.indexId && c.id === input.indexId) continue;
    if (!input.ritDates.has(d)) continue;
    (ritCdhaByDate[d] ||= []).push(c);
  }

  return { sbapByDate, ritByDate, ritCdhaByDate };
}
