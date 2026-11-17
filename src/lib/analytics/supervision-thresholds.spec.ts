// gate-ok: khóa PO 2026-11-01 đổi ngưỡng/mẫu tối thiểu (đỏ <85, xanh ≥90, mẫu 50); expect cũ thay bằng giá trị mới
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THAM_SO_MAC_DINH,
  KHOA_COMPLIANCE_WARN_PCT,
  SUPERVISION_COMPLIANCE_THRESHOLDS,
  VST_COMPARE_MIN_SAMPLE,
  DOI_SOAT_MIN_SAMPLE,
  applyThamSo,
  complianceToneFromPercent,
  resolveThamSo,
  DEFAULT_KHOA_CHART_THRESHOLDS,
  VST_KHOA_CHART_THRESHOLDS,
  isThinSample,
  khoaChartTone,
  khoaTableMinSample,
} from "./supervision-thresholds";

describe("khoaChartTone — hai mức 85/90 dùng chung", () => {
  it("xanh khi ≥90, vàng 85–<90, đỏ <85", () => {
    expect(khoaChartTone(90, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("green");
    expect(khoaChartTone(89.9, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaChartTone(85, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaChartTone(84.9, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("red");
  });

  it("complianceToneFromPercent cùng hai mức", () => {
    expect(complianceToneFromPercent(91)).toBe("green");
    expect(complianceToneFromPercent(87)).toBe("yellow");
    expect(complianceToneFromPercent(84)).toBe("red");
    expect(complianceToneFromPercent(null)).toBe("neutral");
  });
});

describe("khoaChartTone — biểu đồ khoa VST", () => {
  it("xanh khi ≥90, vàng 85–89, đỏ <85", () => {
    expect(VST_KHOA_CHART_THRESHOLDS).toEqual({ warnPct: 90, redPct: 85 });
    expect(khoaChartTone(90, VST_KHOA_CHART_THRESHOLDS)).toBe("green");
    expect(khoaChartTone(89.9, VST_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaChartTone(85, VST_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaChartTone(84.9, VST_KHOA_CHART_THRESHOLDS)).toBe("red");
  });

  it("không tô khi thiếu số liệu", () => {
    expect(khoaChartTone(null, VST_KHOA_CHART_THRESHOLDS)).toBe("neutral");
    expect(khoaChartTone(undefined, VST_KHOA_CHART_THRESHOLDS)).toBe("neutral");
  });
});

describe("min-N bảng tổng hợp khoa", () => {
  it("VST 50, GSC 50, module khác không áp", () => {
    expect(khoaTableMinSample("VST")).toBe(50);
    expect(khoaTableMinSample(" gsc ")).toBe(50);
    expect(khoaTableMinSample("BCTH")).toBeNull();
    expect(khoaTableMinSample(undefined)).toBeNull();
  });

  it("mẫu mỏng khi 0 < n < min-N; n=0 và đủ mẫu thì không", () => {
    expect(isThinSample(49, 50)).toBe(true);
    expect(isThinSample(50, 50)).toBe(false);
    expect(isThinSample(0, 50)).toBe(false);
    expect(isThinSample(5, null)).toBe(false);
  });
});

describe("ca kiểm thử đặc tả M01 — biên mục tiêu 85", () => {
  // @dac-ta T1.02
  it("85/100 không dưới mục tiêu; 84/100 dưới mục tiêu", () => {
    expect(khoaChartTone((85 / 100) * 100, VST_KHOA_CHART_THRESHOLDS)).not.toBe("red");
    expect(khoaChartTone((84 / 100) * 100, VST_KHOA_CHART_THRESHOLDS)).toBe("red");
  });

  // @dac-ta T1.04
  it("so trên giá trị gốc: 1699/2000 = 84,95 hiển thị 85,0 nhưng vẫn dưới mục tiêu", () => {
    const goc = (1699 / 2000) * 100;
    expect(goc.toFixed(1)).toBe("85.0");
    expect(khoaChartTone(goc, VST_KHOA_CHART_THRESHOLDS)).toBe("red");
  });
});

describe("ksnk_dm_tham_so — seed khớp số mặc định trong mã", () => {
  it("giá trị mới nhất của các migration seed = THAM_SO_MAC_DINH, không thừa thiếu", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    const rows: { ma_tham_so: string; gia_tri: number; hieu_luc_tu: string }[] = [];
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql"))) {
      const sql = readFileSync(join(dir, f), "utf8");
      if (!sql.includes("INSERT INTO public.ksnk_dm_tham_so")) continue;
      for (const m of sql.matchAll(/\('([a-z_]+\.[a-z_]+)', (\d+(?:\.\d+)?), '(\d{4}-\d{2}-\d{2})'/g)) {
        rows.push({ ma_tham_so: m[1], gia_tri: Number(m[2]), hieu_luc_tu: m[3] });
      }
    }
    expect(resolveThamSo(rows, "9999-12-31")).toEqual(THAM_SO_MAC_DINH);
  });
});

describe("tham số theo ngày hiệu lực (ksnk_dm_tham_so)", () => {
  const rows = [
    { ma_tham_so: "giam_sat.xanh_min_pct", gia_tri: 85, hieu_luc_tu: "2026-01-01" },
    { ma_tham_so: "giam_sat.xanh_min_pct", gia_tri: "90", hieu_luc_tu: "2027-01-01" },
    { ma_tham_so: "khac.khong_biet", gia_tri: 1, hieu_luc_tu: "2026-01-01" },
  ];

  it("resolveThamSo lấy dòng mới nhất còn hiệu lực, bỏ mã lạ", () => {
    expect(resolveThamSo(rows, "2026-12-31")).toEqual({ "giam_sat.xanh_min_pct": 85 });
    expect(resolveThamSo(rows, "2027-01-01")).toEqual({ "giam_sat.xanh_min_pct": 90 });
    expect(resolveThamSo(rows, "2025-12-31")).toEqual({});
  });

  it("applyThamSo đổi ngưỡng cho nơi dùng; map rỗng trả về mặc định", () => {
    applyThamSo({
      "giam_sat.xanh_min_pct": 88,
      "giam_sat.xanh_tu_pct": 95,
      "giam_sat.vang_min_pct": 80,
      "giam_sat.khoa_canh_bao_pct": 75,
      "vst.khoa_vang_pct": 95,
      "vst.so_sanh_mau_toi_thieu": 40,
      "doi_soat.gsc_mau_toi_thieu": 60,
    });
    expect(complianceToneFromPercent(94)).toBe("yellow");
    expect(complianceToneFromPercent(79)).toBe("red");
    expect(KHOA_COMPLIANCE_WARN_PCT).toBe(75);
    expect(SUPERVISION_COMPLIANCE_THRESHOLDS).toEqual({ GREEN_MIN: 88, GOAL: 95, KHOA_WARN_PCT: 75 });
    expect(khoaChartTone(94, VST_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaTableMinSample("VST")).toBe(40);
    expect(VST_COMPARE_MIN_SAMPLE).toBe(40);
    expect(DOI_SOAT_MIN_SAMPLE.gsc).toBe(60);

    applyThamSo({});
    expect(SUPERVISION_COMPLIANCE_THRESHOLDS).toEqual({ GREEN_MIN: 85, GOAL: 90, KHOA_WARN_PCT: 85 });
    expect(KHOA_COMPLIANCE_WARN_PCT).toBe(85);
    expect(DEFAULT_KHOA_CHART_THRESHOLDS).toEqual({ warnPct: 90, redPct: 85 });
    expect(VST_KHOA_CHART_THRESHOLDS).toEqual({ warnPct: 90, redPct: 85 });
    expect(khoaTableMinSample("VST")).toBe(50);
    expect(DOI_SOAT_MIN_SAMPLE).toEqual({ vst: 50, gsc: 50 });
  });
});
