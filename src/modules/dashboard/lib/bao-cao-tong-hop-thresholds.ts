/** Ngưỡng cảnh báo tuân thủ — pilot; có thể chuyển sang MDM/config sau. */
export const BAO_CAO_TONG_HOP_THRESHOLDS = {
  GREEN_MIN: 85,
  YELLOW_MIN: 70,
} as const;

export type ComplianceTone = "green" | "yellow" | "red" | "neutral";

export function complianceToneFromPercent(value: number | null | undefined): ComplianceTone {
  if (value == null || Number.isNaN(value)) return "neutral";
  if (value >= BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN) return "green";
  if (value >= BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN) return "yellow";
  return "red";
}
