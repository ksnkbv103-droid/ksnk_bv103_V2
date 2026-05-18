/**
 * Công thức điểm tháng QLCV (§6 QUAN_LY_CONG_VIEC_PLAN.md):
 * final_score = 0.45 * on_time_pct + 0.25 * completion_pct + 0.30 * (quality_1_to_5 * 20)
 * — các % đã ở thang 0–100.
 */

export function computeQlcvFinalScore(
  onTimePct: number,
  completionPct: number,
  quality1to5: number | null | undefined,
): number | null {
  if (quality1to5 == null || Number.isNaN(quality1to5)) return null;
  const q = Math.min(5, Math.max(1, Math.round(quality1to5)));
  const ot = Math.min(100, Math.max(0, Number(onTimePct) || 0));
  const cp = Math.min(100, Math.max(0, Number(completionPct) || 0));
  const raw = 0.45 * ot + 0.25 * cp + 0.3 * (q * 20);
  return Math.round(raw * 100) / 100;
}

/** Xếp loại theo điểm tổng 0–100 (§6). */
export function qlcvTierLabelVietnamese(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) return "—";
  if (score >= 90) return "Xuất sắc (90–100)";
  if (score >= 80) return "Tốt (80–89)";
  if (score >= 70) return "Khá (70–79)";
  if (score >= 60) return "Đạt (60–69)";
  return "Cần cải thiện (<60)";
}

export const QLCV_MONTHLY_SCORE_FORMULA_VI =
  "Điểm = 0,45 × (% đúng hạn khi hoàn thành trong tháng) + 0,25 × (% hoàn thành / phiếu trong phạm vi tháng) + 0,30 × (chất lượng 1–5 × 20). Chỉ tính phiếu gốc; việc con không vào KPI nhân viên.";
