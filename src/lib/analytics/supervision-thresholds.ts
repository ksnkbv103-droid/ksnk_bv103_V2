/**
 * Ngưỡng tuân thủ giám sát — SSOT (chart · bảng · in · chỉ số). Khóa PO 2026-11-01:
 * <85 đỏ · 85–<90 vàng · ≥90 xanh; cỡ mẫu tối thiểu 50 theo khoa/kỳ (VST và GSC).
 * Các số trong file này là MẶC ĐỊNH; giá trị đang áp dụng lấy từ bảng `ksnk_dm_tham_so`
 * qua `applyThamSo` (root layout gọi mỗi request). Đọc giá trị lúc dùng, đừng chép ra hằng khác.
 */
export const SUPERVISION_COMPLIANCE_THRESHOLDS: {
  GREEN_MIN: number;
  GOAL: number;
  KHOA_WARN_PCT: number;
} = {
  /** Dưới mốc này là đỏ (mốc đỏ/vàng). @dac-ta R1.12 */
  GREEN_MIN: 85,
  /** Mốc xanh: từ mức này trở lên là xanh. */
  GOAL: 90,
  /** Tô cảnh báo cột/bảng theo khoa — cùng mốc đỏ. */
  KHOA_WARN_PCT: 85,
};

/** Ngưỡng tô cảnh báo % khoa (binding sống của `KHOA_WARN_PCT`). */
export let KHOA_COMPLIANCE_WARN_PCT: number = SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT;

/** Cỡ mẫu tối thiểu % theo khoa/kỳ (đối soát, Action board): 50 cơ hội VST · 50 tiêu chí GSC. */
export const DOI_SOAT_MIN_SAMPLE: { vst: number; gsc: number } = {
  vst: 50,
  gsc: 50,
};

/** So sánh khoa/khối/nghề/thời điểm — dưới ngưỡng = «chưa đủ mẫu», không tô màu. */
export let VST_COMPARE_MIN_SAMPLE: number = 50;

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

/** Hai mức dùng chung GSC/BCTH — vàng từ 85%, xanh từ 90%. */
export const DEFAULT_KHOA_CHART_THRESHOLDS: KhoaChartThresholds = {
  warnPct: SUPERVISION_COMPLIANCE_THRESHOLDS.GOAL,
  redPct: 85,
};

/** Ngưỡng biểu đồ khoa VST — cùng hai mức, tham số riêng để đổi độc lập. */
export const VST_KHOA_CHART_THRESHOLDS: KhoaChartThresholds = { warnPct: 90, redPct: 85 };

/**
 * Mã tham số ↔ số mặc định trong file này = giá trị MỚI NHẤT của mọi migration seed `ksnk_dm_tham_so`
 * (spec đối chiếu); DB là nơi đổi giá trị theo ngày hiệu lực.
 */
export const THAM_SO_MAC_DINH = Object.freeze({
  "giam_sat.xanh_min_pct": SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
  "giam_sat.xanh_tu_pct": SUPERVISION_COMPLIANCE_THRESHOLDS.GOAL,
  "giam_sat.vang_min_pct": DEFAULT_KHOA_CHART_THRESHOLDS.redPct,
  "giam_sat.khoa_canh_bao_pct": SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT,
  "vst.khoa_vang_pct": VST_KHOA_CHART_THRESHOLDS.warnPct,
  "vst.khoa_do_pct": VST_KHOA_CHART_THRESHOLDS.redPct,
  "vst.so_sanh_mau_toi_thieu": VST_COMPARE_MIN_SAMPLE,
  "doi_soat.vst_mau_toi_thieu": DOI_SOAT_MIN_SAMPLE.vst,
  "doi_soat.gsc_mau_toi_thieu": DOI_SOAT_MIN_SAMPLE.gsc,
});

export type MaThamSo = keyof typeof THAM_SO_MAC_DINH;
export type ThamSoMap = Partial<Record<MaThamSo, number>>;

/** Chọn giá trị đang áp dụng tại `ngay` (YYYY-MM-DD): dòng có `hieu_luc_tu` lớn nhất ≤ ngày, theo từng mã. Mã lạ bị bỏ. */
export function resolveThamSo(
  rows: ReadonlyArray<{ ma_tham_so: string; gia_tri: number | string; hieu_luc_tu: string }>,
  ngay: string,
): ThamSoMap {
  const out: ThamSoMap = {};
  const tu: Partial<Record<MaThamSo, string>> = {};
  for (const r of rows) {
    if (!(r.ma_tham_so in THAM_SO_MAC_DINH)) continue;
    const ma = r.ma_tham_so as MaThamSo;
    const v = Number(r.gia_tri);
    if (!Number.isFinite(v) || r.hieu_luc_tu > ngay) continue;
    if (tu[ma] == null || r.hieu_luc_tu > tu[ma]!) {
      tu[ma] = r.hieu_luc_tu;
      out[ma] = v;
    }
  }
  return out;
}

/** Đặt giá trị đang áp dụng cho mọi nơi đọc ngưỡng; mã thiếu → về mặc định. */
export function applyThamSo(values: ThamSoMap): void {
  const v = { ...THAM_SO_MAC_DINH, ...values };
  SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN = v["giam_sat.xanh_min_pct"];
  SUPERVISION_COMPLIANCE_THRESHOLDS.GOAL = v["giam_sat.xanh_tu_pct"];
  SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT = v["giam_sat.khoa_canh_bao_pct"];
  KHOA_COMPLIANCE_WARN_PCT = v["giam_sat.khoa_canh_bao_pct"];
  DEFAULT_KHOA_CHART_THRESHOLDS.warnPct = v["giam_sat.xanh_tu_pct"];
  DEFAULT_KHOA_CHART_THRESHOLDS.redPct = v["giam_sat.vang_min_pct"];
  VST_KHOA_CHART_THRESHOLDS.warnPct = v["vst.khoa_vang_pct"];
  VST_KHOA_CHART_THRESHOLDS.redPct = v["vst.khoa_do_pct"];
  VST_COMPARE_MIN_SAMPLE = v["vst.so_sanh_mau_toi_thieu"];
  DOI_SOAT_MIN_SAMPLE.vst = v["doi_soat.vst_mau_toi_thieu"];
  DOI_SOAT_MIN_SAMPLE.gsc = v["doi_soat.gsc_mau_toi_thieu"];
}

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

/** Tự giám sát cao hơn chuyên trách từ mức này (điểm %) thì cảnh báo — PO chốt 2026-11-01. */
export const TGS_OVER_KSNK_ALERT_POINTS = 10;
