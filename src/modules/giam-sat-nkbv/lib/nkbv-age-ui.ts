/**
 * Cổng UI tuổi NKBV — BV người lớn: thiếu ngày sinh → ẩn nhánh nhi.
 * Engine CDC (LCBI3 / SUTI2 / PNEU nhánh tuổi) giữ nguyên; chỉ điều khiển form/checklist.
 */

import type { Ch17Node } from "./nkbv-ch17-criteria";
import { ageYearsFromNgaySinh, isInfantLe1FromAge } from "./nkbv-uti-timeline-verdict";

export type NkbvPneuAgeUiBranch = "INFANT_LE1" | "CHILD_1_12" | "ADULT";

/** Hiện checkbox + triệu chứng ≤1 tuổi chỉ khi DOB chứng minh ≤1. */
export function showInfantCriteriaUi(ageYears: number | null | undefined): boolean {
  return ageYears != null && ageYears <= 1;
}

/**
 * Nhánh PNEU trên form theo ngày sinh.
 * Thiếu DOB → ADULT (không mở nhi bằng nhập tay tuổi).
 */
export function pneuAgeUiBranchFromAge(
  ageYears: number | null | undefined,
): NkbvPneuAgeUiBranch {
  if (ageYears == null) return "ADULT";
  if (ageYears <= 1) return "INFANT_LE1";
  if (ageYears <= 12) return "CHILD_1_12";
  return "ADULT";
}

/** Cờ is_infant_le1 gửi engine: chỉ true khi DOB ≤1. */
export function resolveIsInfantLe1Flag(ageYears: number | null | undefined): boolean {
  return showInfantCriteriaUi(ageYears);
}

/**
 * Tuổi ghi vào verification PNEU/VAE khi thiếu DOB mà patient_age đang ≤12
 * (tránh lỡ nhánh nhi). Mặc định người lớn = 45 (cùng convention timeline).
 */
export function coerceAdultPatientAge(
  ageYearsFromDob: number | null | undefined,
  patientAge: number | null | undefined,
): number {
  if (ageYearsFromDob != null) return ageYearsFromDob;
  const n = Number(patientAge) || 0;
  if (n <= 12) return 45;
  return n;
}

/** Ẩn tiêu chuẩn Ch.17 bọc ageGate không khớp tuổi hiện tại. */
export function ch17CriterionVisibleForAge(
  node: Ch17Node,
  isInfantLe1: boolean,
): boolean {
  if (node.kind !== "ageGate") return true;
  if (node.age === "INFANT_LE1") return isInfantLe1;
  if (node.age === "OVER_1Y") return !isInfantLe1;
  return true;
}

export { ageYearsFromNgaySinh, isInfantLe1FromAge };
