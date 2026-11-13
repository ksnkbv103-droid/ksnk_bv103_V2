import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  THAM_SO_MAC_DINH,
  DEFAULT_KHOA_CHART_THRESHOLDS,
  VST_KHOA_CHART_THRESHOLDS,
  isThinSample,
  khoaChartTone,
  khoaTableMinSample,
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

describe("min-N bảng tổng hợp khoa", () => {
  it("VST 20, GSC 30, module khác không áp", () => {
    expect(khoaTableMinSample("VST")).toBe(20);
    expect(khoaTableMinSample(" gsc ")).toBe(30);
    expect(khoaTableMinSample("BCTH")).toBeNull();
    expect(khoaTableMinSample(undefined)).toBeNull();
  });

  it("mẫu mỏng khi 0 < n < min-N; n=0 và đủ mẫu thì không", () => {
    expect(isThinSample(19, 20)).toBe(true);
    expect(isThinSample(20, 20)).toBe(false);
    expect(isThinSample(0, 20)).toBe(false);
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
  it("mỗi mã tham số trong migration có đúng giá trị của THAM_SO_MAC_DINH và không thừa thiếu", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20261114100000_ksnk_dm_tham_so.sql"),
      "utf8",
    );
    const seed = Object.fromEntries(
      [...sql.matchAll(/\('([a-z_]+\.[a-z_]+)', (\d+(?:\.\d+)?), '\d{4}-\d{2}-\d{2}'/g)].map((m) => [
        m[1],
        Number(m[2]),
      ]),
    );
    expect(seed).toEqual(THAM_SO_MAC_DINH);
  });
});
