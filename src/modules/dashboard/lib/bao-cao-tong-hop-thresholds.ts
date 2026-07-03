import {
  complianceToneFromPercent,
  SUPERVISION_COMPLIANCE_THRESHOLDS,
  type ComplianceTone,
} from "@/lib/analytics/supervision-thresholds";

/** @deprecated Dùng `SUPERVISION_COMPLIANCE_THRESHOLDS` — giữ alias tương thích báo cáo in. */
export const BAO_CAO_TONG_HOP_THRESHOLDS = {
  GREEN_MIN: SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
  YELLOW_MIN: SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN,
} as const;

export type { ComplianceTone };
export { complianceToneFromPercent };
