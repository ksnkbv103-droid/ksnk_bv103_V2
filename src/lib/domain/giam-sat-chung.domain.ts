/**
 * Giám sát chung - Domain Logic
 * 
 * Chứa các hàm tính toán nghiệp vụ thuần (Pure Functions).
 * KHÔNG phụ thuộc vào Supabase/Next.js.
 * Tham chiếu: AGENTS.md 5c (Domain Layer)
 */

import { ChecklistResult } from "@/modules/giam-sat-chung/types";

/**
 * Tính toán tỷ lệ tuân thủ (%) cho một phiên giám sát.
 * Tỷ lệ = (Số tiêu chí Đạt) / (Tổng số tiêu chí đã đánh giá - không tính NA) * 100
 */
export function calculateGscComplianceScore(results: ChecklistResult[]): number {
  if (!results || results.length === 0) return 0;
  
  const evaluableResults = results.filter(r => r.value !== "NA");
  if (evaluableResults.length === 0) return 0;
  
  const datCount = evaluableResults.filter(r => r.value === "DAT").length;
  return Math.round((datCount / evaluableResults.length) * 100);
}

/**
 * Phân loại mức độ tuân thủ dựa trên điểm số.
 */
export function classifyGscCompliance(score: number): "TOT" | "DAT" | "KHONG_DAT" {
  if (score >= 90) return "TOT";
  if (score >= 80) return "DAT";
  return "KHONG_DAT";
}
