/**
 * Cổng tuổi NKBV — BV103 chỉ giám sát người lớn.
 * L02/20b: không invent age=45 khi thiếu DOB/tuổi.
 */

import type { Ch17Node } from "./nkbv-ch17-criteria";
import { ageYearsFromNgaySinh } from "./nkbv-uti-timeline-verdict";

export type NkbvPneuAgeUiBranch = "ADULT";

export function pneuAgeUiBranchFromAge(_ageYears?: number | null): NkbvPneuAgeUiBranch {
  return "ADULT";
}

/**
 * Trả tuổi người lớn đã biết, hoặc null nếu thiếu DOB/tuổi hợp lệ.
 * Không còn default 45 (DoD 20b).
 */
export function coerceAdultPatientAge(
  ageYearsFromDob: number | null | undefined,
  patientAge: number | null | undefined,
): number | null {
  if (ageYearsFromDob != null && ageYearsFromDob > 12) return ageYearsFromDob;
  const n = Number(patientAge);
  if (Number.isFinite(n) && n > 12) return n;
  return null;
}

/** Ch.17 ageGate: chỉ còn OVER_1Y (người lớn). */
export function ch17CriterionVisibleForAge(node: Ch17Node): boolean {
  if (node.kind !== "ageGate") return true;
  return node.age === "OVER_1Y";
}

export { ageYearsFromNgaySinh };
