/**
 * Phân luồng VAE người lớn vs cây PNEU/VAP — PNEU-AUDIT-A5.
 * VAE in-plan: ≥18 tuổi và thở máy ≥4 ngày lịch.
 * L02/20b: thiếu DOB/tuổi → không classify dương tính (cấm default age=45).
 */

/** DoD 20b §3 — message gate / NO_EVENT khi thiếu DOB hoặc tuổi. */
export const MISSING_DOB_NO_EVENT_REASON = "Thiếu ngày sinh — không xác định ca";

export function isKnownPatientAge(
  ageYears: number | null | undefined,
): ageYears is number {
  if (ageYears == null) return false;
  const n = Number(ageYears);
  return Number.isFinite(n) && n >= 0;
}

export function isAdultVaeInPlan(
  ageYears: number | null | undefined,
  ventCalendarDays: number,
): boolean {
  if (!isKnownPatientAge(ageYears)) return false;
  const days = Number(ventCalendarDays);
  if (!Number.isFinite(days)) return false;
  return ageYears >= 18 && days >= 4;
}

export const ADULT_VAE_IN_PLAN_REASON =
  "Người lớn ≥18 tuổi thở máy ≥4 ngày lịch — dùng cây VAE (VAC→IVAC→PVAP), không phân loại PNEU/VAP.";
