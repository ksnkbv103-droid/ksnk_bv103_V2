/**
 * Giám sát chung — domain thuần (không Supabase/Next).
 * Scoring engine SSOT: `giam-sat-scoring.ts`.
 * File này chỉ còn phân loại nhãn % TY_LE (Tốt / Đạt / Không đạt).
 */

/**
 * Phân loại mức độ tuân thủ dựa trên điểm số (ngưỡng JCI: ≥90 Tốt, ≥80 Đạt).
 */
export function classifyGscCompliance(score: number): "TOT" | "DAT" | "KHONG_DAT" {
  if (score >= 90) return "TOT";
  if (score >= 80) return "DAT";
  return "KHONG_DAT";
}

const GSC_COMPLIANCE_LABELS: Record<ReturnType<typeof classifyGscCompliance>, string> = {
  TOT: "Tốt",
  DAT: "Đạt",
  KHONG_DAT: "Không đạt",
};

/** Nhãn + class Tailwind cho cột lịch sử / dashboard (kiểu TY_LE). */
export function gscComplianceDisplay(score: number): { label: string; className: string } {
  const tier = classifyGscCompliance(score);
  const className =
    tier === "TOT"
      ? "text-emerald-700"
      : tier === "DAT"
        ? "text-amber-600"
        : "text-red-600";
  return { label: GSC_COMPLIANCE_LABELS[tier], className };
}
