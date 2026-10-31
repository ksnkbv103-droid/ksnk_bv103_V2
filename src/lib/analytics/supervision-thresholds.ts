/** Ngưỡng tuân thủ giám sát — SSOT, khóa PO 2026-11-01: <85 đỏ · 85–<90 vàng · ≥90 xanh. */
export const SUPERVISION_COMPLIANCE_THRESHOLDS = {
  /** Mục tiêu viện — dưới mốc này là đỏ (cũng là fallback `ksnk_dm_muc_tieu_kpi`) */
  GREEN_MIN: 85,
  /** Mốc xanh (lộ trình) */
  GOAL: 90,
  /** Tô cảnh báo cột/bảng theo khoa — cùng mốc đỏ */
  KHOA_WARN_PCT: 85,
} as const;

/** Cỡ mẫu tối thiểu % theo khoa/kỳ — khóa PO 2026-11-01: 50 cơ hội VST · 50 tiêu chí GSC. */
export const DOI_SOAT_MIN_SAMPLE = {
  vst: 50,
  gsc: 50,
} as const;

/** So sánh khoa/khối/nghề/thời điểm — dưới ngưỡng = «chưa đủ mẫu», không tô màu. */
export const VST_COMPARE_MIN_SAMPLE = DOI_SOAT_MIN_SAMPLE.vst;

/** Min-N bảng tổng hợp khoa theo module (VST/GSC cùng 50). Module khác: không áp. */
export function khoaTableMinSample(moduleLabel?: string | null): number | null {
  const key = String(moduleLabel ?? "").trim().toUpperCase();
  if (key === "VST") return VST_COMPARE_MIN_SAMPLE;
  if (key === "GSC") return DOI_SOAT_MIN_SAMPLE.gsc;
  return null;
}

/** Mẫu mỏng: có min-N và 0 < n < min-N. n = 0 là «không có dữ liệu», không phải mẫu mỏng. */
export function isThinSample(n: number, minSample: number | null): boolean {
  return minSample != null && n > 0 && n < minSample;
}

/** Ngưỡng tô cột biểu đồ khoa (warn = vàng, red = đỏ). */
export type KhoaChartThresholds = {
  warnPct: number;
  redPct: number;
};

/** Hai mức dùng chung VST/GSC/BCTH — vàng từ 85%, xanh từ 90%. */
export const DEFAULT_KHOA_CHART_THRESHOLDS: KhoaChartThresholds = {
  warnPct: SUPERVISION_COMPLIANCE_THRESHOLDS.GOAL,
  redPct: SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
};

/** Giữ tên cũ cho nơi gọi VST — cùng hai mức với mặc định. */
export const VST_KHOA_CHART_THRESHOLDS: KhoaChartThresholds = DEFAULT_KHOA_CHART_THRESHOLDS;

export type ComplianceTone = "green" | "yellow" | "red" | "neutral";

export function complianceToneFromPercent(value: number | null | undefined): ComplianceTone {
  if (value == null || Number.isNaN(value)) return "neutral";
  return khoaChartTone(value, DEFAULT_KHOA_CHART_THRESHOLDS);
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
