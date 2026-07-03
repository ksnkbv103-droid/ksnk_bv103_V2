/** Ngưỡng tuân thủ giám sát — SSOT pilot (chart · bảng · in · KPI). */
export const SUPERVISION_COMPLIANCE_THRESHOLDS = {
  /** Đạt mục tiêu BGĐ */
  GREEN_MIN: 85,
  /** Cần theo dõi */
  YELLOW_MIN: 70,
  /** Tô cảnh báo cột/bảng theo khoa */
  KHOA_WARN_PCT: 80,
} as const;

export type ComplianceTone = "green" | "yellow" | "red" | "neutral";

export function complianceToneFromPercent(value: number | null | undefined): ComplianceTone {
  if (value == null || Number.isNaN(value)) return "neutral";
  if (value >= SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN) return "green";
  if (value >= SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN) return "yellow";
  return "red";
}
