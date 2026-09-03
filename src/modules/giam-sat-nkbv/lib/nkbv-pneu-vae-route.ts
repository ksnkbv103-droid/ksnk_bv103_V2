/**
 * Phân luồng VAE người lớn vs cây PNEU/VAP — PNEU-AUDIT-A5.
 * VAE in-plan: ≥18 tuổi và thở máy ≥4 ngày lịch.
 */

export function isAdultVaeInPlan(
  ageYears: number | null | undefined,
  ventCalendarDays: number,
): boolean {
  const age = Number(ageYears);
  const days = Number(ventCalendarDays);
  if (!Number.isFinite(age) || !Number.isFinite(days)) return false;
  return age >= 18 && days >= 4;
}

export const ADULT_VAE_IN_PLAN_REASON =
  "Người lớn ≥18 tuổi thở máy ≥4 ngày lịch — dùng cây VAE (VAC→IVAC→PVAP), không phân loại PNEU/VAP.";
