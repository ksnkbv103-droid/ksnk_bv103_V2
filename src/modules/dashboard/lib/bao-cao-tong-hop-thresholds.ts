import {
  complianceToneFromPercent,
  DEFAULT_KHOA_CHART_THRESHOLDS,
  khoaChartTone,
  VST_KHOA_CHART_THRESHOLDS,
  type ComplianceTone,
} from "@/lib/analytics/supervision-thresholds";

export type { ComplianceTone };
export { complianceToneFromPercent, khoaChartTone, DEFAULT_KHOA_CHART_THRESHOLDS, VST_KHOA_CHART_THRESHOLDS };

/** BCTH-06: VST/GSC cùng 90/85 — dùng chung UI + in. */
export function bcthModuleComplianceTone(
  module: "vst" | "gsc",
  value: number | null | undefined,
): ComplianceTone {
  return khoaChartTone(
    value,
    module === "vst" ? VST_KHOA_CHART_THRESHOLDS : DEFAULT_KHOA_CHART_THRESHOLDS,
  );
}
