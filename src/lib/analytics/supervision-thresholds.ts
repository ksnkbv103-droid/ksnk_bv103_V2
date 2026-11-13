/**
 * Ngưỡng tuân thủ giám sát — SSOT pilot (chart · bảng · in · KPI). Số chờ N-GS-3.
 * Các số trong file này là MẶC ĐỊNH; giá trị đang áp dụng lấy từ bảng `ksnk_dm_tham_so`
 * qua `applyThamSo` (root layout gọi mỗi request). Đọc giá trị lúc dùng, đừng chép ra hằng khác.
 */
export const SUPERVISION_COMPLIANCE_THRESHOLDS: { GREEN_MIN: number; YELLOW_MIN: number; KHOA_WARN_PCT: number } = {
  /** Mốc tham chiếu xanh (pilot). @dac-ta R1.12 */
  GREEN_MIN: 85,
  /** Mốc tham chiếu vàng (pilot) */
  YELLOW_MIN: 70,
  /** Tô cảnh báo cột/bảng theo khoa */
  KHOA_WARN_PCT: 80,
};

/** Ngưỡng tô cảnh báo % khoa (binding sống của `KHOA_WARN_PCT`). */
export let KHOA_COMPLIANCE_WARN_PCT: number = SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT;

/** GS-07: min-N đối soát — tạm dùng cùng mốc Action board (20 VST / 30 GSC). */
export const DOI_SOAT_MIN_SAMPLE: { vst: number; gsc: number } = {
  vst: 20,
  gsc: 30,
};

/** VST-07: so sánh khoa/khối/nghề/thời điểm — dưới ngưỡng = «mẫu mỏng», không tô màu. */
export let VST_COMPARE_MIN_SAMPLE: number = 20;

/** Min-N bảng tổng hợp khoa theo module: VST 20 cơ hội, GSC 30 (cùng mốc đối soát). Module khác: không áp. */
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

/**
 * Mã tham số ↔ số mặc định trong file này. Bảng `ksnk_dm_tham_so` seed đúng các số này
 * (spec đối chiếu với migration); DB là nơi đổi giá trị theo ngày hiệu lực.
 */
export const THAM_SO_MAC_DINH = Object.freeze({
  "giam_sat.xanh_min_pct": SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
  "giam_sat.vang_min_pct": SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN,
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
  SUPERVISION_COMPLIANCE_THRESHOLDS.YELLOW_MIN = v["giam_sat.vang_min_pct"];
  SUPERVISION_COMPLIANCE_THRESHOLDS.KHOA_WARN_PCT = v["giam_sat.khoa_canh_bao_pct"];
  KHOA_COMPLIANCE_WARN_PCT = v["giam_sat.khoa_canh_bao_pct"];
  DEFAULT_KHOA_CHART_THRESHOLDS.warnPct = v["giam_sat.khoa_canh_bao_pct"];
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
