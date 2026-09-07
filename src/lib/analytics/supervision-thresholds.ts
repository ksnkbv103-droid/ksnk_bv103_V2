/** Ngưỡng tuân thủ giám sát — SSOT pilot (chart · bảng · in · KPI). */
export const SUPERVISION_COMPLIANCE_THRESHOLDS = {
  /** Đạt mục tiêu BGĐ */
  GREEN_MIN: 85,
  /** Cần theo dõi */
  YELLOW_MIN: 70,
  /** Tô cảnh báo cột/bảng theo khoa */
  KHOA_WARN_PCT: 80,
} as const;

/** Ngưỡng tô cột biểu đồ khoa (warn = vàng, red = đỏ). */
export type KhoaChartThresholds = {
  warnPct: number;
  redPct: number;
};

/** Mặc định GSC / BCTH — vàng <80%, đỏ <70%. */
export const DEFAULT_KHOA_CHART_THRESHOLDS: KhoaChartThresholds = {
  warnPct: SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT,
  redPct: SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN,
};

/** Biểu đồ khoa VST — vàng <90%, đỏ <85%. Không đổi GREEN_MIN/YELLOW_MIN dashboard. */
export const VST_KHOA_CHART_THRESHOLDS: KhoaChartThresholds = {
  warnPct: 90,
  redPct: 85,
};

export type ComplianceTone = "green" | "yellow" | "red" | "neutral";

export function complianceToneFromPercent(value: number | null | undefined): ComplianceTone {
  if (value == null || Number.isNaN(value)) return "neutral";
  if (value >= SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN) return "green";
  if (value >= SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN) return "yellow";
  return "red";
}

export function khoaChartTone(
  value: number | null | undefined,
  thresholds: KhoaChartThresholds = DEFAULT_KHOA_CHART_THRESHOLDS,
): ComplianceTone {
  if (value == null || Number.isNaN(value)) return "neutral";
  if (value >= thresholds.warnPct) return "green";
  if (value >= thresholds.redPct) return "yellow";
  return "red";
}
