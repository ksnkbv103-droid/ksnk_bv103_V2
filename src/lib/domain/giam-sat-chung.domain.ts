/**
 * Giám sát chung - Domain Logic
 * 
 * Chứa các hàm tính toán nghiệp vụ thuần (Pure Functions).
 * KHÔNG phụ thuộc vào Supabase/Next.js.
 * Tham chiếu: AGENTS.md 5c (Domain Layer)
 */

import { ChecklistResult } from "@/modules/giam-sat-chung/types";

export function calculateGscComplianceScore(results: ChecklistResult[]): number {
  if (!results || results.length === 0) return 0;
  
  const evaluableResults = results.filter(r => r.value !== "NA");
  if (evaluableResults.length === 0) return 0;
  
  let hasRedFlagViolation = false;
  let totalWeightedMax = 0;
  let totalWeightedEarned = 0;

  const weights = { CRITICAL: 10, MAJOR: 5, MINOR: 1 };

  for (const r of evaluableResults) {
    const weightType = r.weightType || 'MAJOR';
    const w = weights[weightType] || 5;
    totalWeightedMax += w;

    if (r.value === "DAT") {
      totalWeightedEarned += w;
    } else if (r.value === "KHONG_DAT") {
      if (r.isRedFlag) {
        hasRedFlagViolation = true;
      }
    }
  }

  if (hasRedFlagViolation) return 0; // Vi phạm lỗi cờ đỏ chí mạng -> 0% Đạt
  if (totalWeightedMax === 0) return 100;
  
  return Math.round((totalWeightedEarned / totalWeightedMax) * 100);
}

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

/** Nhãn + class Tailwind cho cột lịch sử / dashboard. */
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
