import { describe, expect, it } from "vitest";
import {
  DEFAULT_KHOA_CHART_THRESHOLDS,
  VST_KHOA_CHART_THRESHOLDS,
  khoaChartTone,
} from "./supervision-thresholds";

describe("khoaChartTone — mặc định GSC/BCTH", () => {
  it("xanh khi ≥80, vàng 70–79, đỏ <70", () => {
    expect(khoaChartTone(80, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("green");
    expect(khoaChartTone(79.9, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaChartTone(70, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("yellow");
    expect(khoaChartTone(69.9, DEFAULT_KHOA_CHART_THRESHOLDS)).toBe("red");
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
