/**
 * Cổng tuổi NKBV — BV103 chỉ giám sát người lớn.
 */

import type { Ch17Node } from "./nkbv-ch17-criteria";
import { ageYearsFromNgaySinh } from "./nkbv-uti-timeline-verdict";

export type NkbvPneuAgeUiBranch = "ADULT";

export function pneuAgeUiBranchFromAge(_ageYears?: number | null): NkbvPneuAgeUiBranch {
  return "ADULT";
}

export function coerceAdultPatientAge(
  ageYearsFromDob: number | null | undefined,
  patientAge: number | null | undefined,
): number {
  if (ageYearsFromDob != null && ageYearsFromDob > 12) return ageYearsFromDob;
  const n = Number(patientAge) || 0;
  if (n > 12) return n;
  return 45;
}

/** Ch.17 ageGate: chỉ còn OVER_1Y (người lớn). */
export function ch17CriterionVisibleForAge(node: Ch17Node, _isInfantLe1?: boolean): boolean {
  if (node.kind !== "ageGate") return true;
  return node.age === "OVER_1Y";
}

export { ageYearsFromNgaySinh };
