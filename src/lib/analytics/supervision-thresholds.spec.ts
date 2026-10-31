import { describe, expect, it } from "vitest";
import {
  DEFAULT_KHOA_CHART_THRESHOLDS,
  complianceToneFromPercent,
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
