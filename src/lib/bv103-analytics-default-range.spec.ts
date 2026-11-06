import { describe, expect, it } from "vitest";
import {
  BV103_ANALYTICS_ALL_TIME_START,
  bv103DefaultTuNgayFromDenIso,
  getBv103AnalyticsPresets,
} from "./bv103-analytics-default-range";

describe("bv103-analytics-default-range", () => {
  it("computes default tuNgay as 3 months prior", () => {
    expect(bv103DefaultTuNgayFromDenIso("2026-11-04")).toBe("2026-09-01");
  });

  it("builds correct presets for a given date", () => {
    const presets = getBv103AnalyticsPresets("2026-11-04");
    const byId = Object.fromEntries(presets.map((p) => [p.id, p]));

    expect(byId.toan_bo).toEqual({
      id: "toan_bo",
      label: "Toàn bộ",
      tuNgay: BV103_ANALYTICS_ALL_TIME_START,
      denNgay: "2026-11-04",
    });
    expect(byId.nam_nay).toEqual({
      id: "nam_nay",
      label: "Năm nay",
      tuNgay: "2026-01-01",
      denNgay: "2026-11-04",
    });
    expect(byId["12_thang"]).toEqual({
      id: "12_thang",
      label: "12 tháng",
      tuNgay: "2025-12-01",
      denNgay: "2026-11-04",
    });
    expect(byId.quy_nay).toEqual({
      id: "quy_nay",
      label: "Quý này",
      tuNgay: "2026-10-01",
      denNgay: "2026-11-04",
    });
    expect(byId["3_thang"]).toEqual({
      id: "3_thang",
      label: "3 tháng",
      tuNgay: "2026-09-01",
      denNgay: "2026-11-04",
    });
    expect(byId.thang_nay).toEqual({
      id: "thang_nay",
      label: "Tháng này",
      tuNgay: "2026-11-01",
      denNgay: "2026-11-04",
    });
  });
});
