import {
  complianceToneFromPercent,
  DEFAULT_KHOA_CHART_THRESHOLDS,
  khoaChartTone,
  SUPERVISION_COMPLIANCE_THRESHOLDS,
  VST_KHOA_CHART_THRESHOLDS,
  type ComplianceTone,
} from "@/lib/analytics/supervision-thresholds";

/** @deprecated Dùng `SUPERVISION_COMPLIANCE_THRESHOLDS` — giữ alias tương thích báo cáo in. */
export const BAO_CAO_TONG_HOP_THRESHOLDS = {
  GREEN_MIN: SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
  YELLOW_MIN: SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN,
} as const;

export type { ComplianceTone };
export { complianceToneFromPercent, khoaChartTone, DEFAULT_KHOA_CHART_THRESHOLDS, VST_KHOA_CHART_THRESHOLDS };

/** BCTH-06: VST 90/85 · GSC (mặc định) 80/70 — dùng chung UI + in. */
export function bcthModuleComplianceTone(
  module: "vst" | "gsc",
  value: number | null | undefined,
): ComplianceTone {
  return khoaChartTone(
    value,
    module === "vst" ? VST_KHOA_CHART_THRESHOLDS : DEFAULT_KHOA_CHART_THRESHOLDS,
  );
}
