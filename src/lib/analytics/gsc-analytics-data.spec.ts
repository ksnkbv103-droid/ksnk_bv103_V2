import { describe, expect, it } from "vitest";
import { gscAnalyticsPayloadHasData } from "./gsc-analytics-data";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";

const emptyPayload = (): GscStrategicPayload => ({
  kpis: {
    tong_phien: 0,
    tong_quan_sat: 0,
    tong_dat: 0,
    tong_vi_pham: 0,
    ty_le_tuan_thu: 0,
  },
  trendline: [],
  matrix_khoa: [],
  top_violations: [],
  gap_analysis: [],
  dynamic_checklists: [],
  workload: {
    khoa_tu_giam_sat: 0,
    khoa_duoc_ksnk_giam_sat: 0,
    chuyen_de_duoc_ksnk_phu: 0,
    ksnk_so_phien: 0,
    co_cau_giam_sat: [],
  },
});

describe("gscAnalyticsPayloadHasData", () => {
  it("returns false for null/empty", () => {
    expect(gscAnalyticsPayloadHasData(null)).toBe(false);
    expect(gscAnalyticsPayloadHasData(emptyPayload())).toBe(false);
  });

  it("returns true when có phiên hoặc tiêu chí áp dụng", () => {
    const withSessions = emptyPayload();
    withSessions.kpis.tong_phien = 2;
    expect(gscAnalyticsPayloadHasData(withSessions)).toBe(true);

    const withCriteria = emptyPayload();
    withCriteria.kpis.tong_quan_sat = 5;
    expect(gscAnalyticsPayloadHasData(withCriteria)).toBe(true);
  });

  it("returns true when trendline có quan sát", () => {
    const p = emptyPayload();
    p.trendline = [{ label: "T1", min_date: "2026-01-01", tong_quan_sat: 3, tong_dat: 2, ty_le_tuan_thu: 66.7 }];
    expect(gscAnalyticsPayloadHasData(p)).toBe(true);
  });
});
