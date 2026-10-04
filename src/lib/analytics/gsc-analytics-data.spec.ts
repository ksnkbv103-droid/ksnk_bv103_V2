import { describe, expect, it } from "vitest";
import {
  gscAnalyticsPayloadHasData,
  gscGapDoLech,
  normalizeGscChecklistDetailPercents,
  normalizeGscStrategicPercents,
} from "./gsc-analytics-data";
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
  checklist_overview: [],
  workload: {
    khoa_tu_giam_sat: 0,
    khoa_duoc_ksnk_giam_sat: 0,
    chuyen_de_duoc_ksnk_phu: 0,
    ksnk_so_phien: 0,
    co_cau_giam_sat: [],
  },
});

describe("normalizeGscStrategicPercents", () => {
  it("recomputes 2/3 as 66.67 instead of RPC 1-decimal 66.7", () => {
    const p = emptyPayload();
    p.kpis = {
      tong_phien: 1,
      tong_quan_sat: 3,
      tong_dat: 2,
      tong_vi_pham: 1,
      ty_le_tuan_thu: 66.7,
    };
    p.trendline = [
      { label: "T1", min_date: "2026-01-01", tong_quan_sat: 3, tong_dat: 2, ty_le_tuan_thu: 66.7 },
    ];
    p.top_violations = [
      {
        criterion_id: "c1",
        ten_tieu_chi: "Rửa tay",
        ten_bang_kiem: "BK",
        so_vi_pham: 1,
        tong_quan_sat: 3,
        ty_le_vi_pham: 33.3,
      },
    ];
    p.gap_analysis = [
      {
        id: "k1",
        ten: "Nội",
        tgs_quan_sat: 3,
        tgs_dat: 2,
        ty_le_tgs: 66.7,
        ksnk_quan_sat: 3,
        ksnk_dat: 1,
        ty_le_ksnk: 33.3,
        do_lech: 33.4,
      },
    ];
    const out = normalizeGscStrategicPercents(p);
    expect(out.kpis.ty_le_tuan_thu).toBe(66.67);
    expect(out.trendline[0]?.ty_le_tuan_thu).toBe(66.67);
    expect(out.top_violations[0]?.ty_le_vi_pham).toBe(33.33);
    expect(out.gap_analysis[0]?.ty_le_tgs).toBe(66.67);
    expect(out.gap_analysis[0]?.ty_le_ksnk).toBe(33.33);
    expect(out.gap_analysis[0]?.do_lech).toBe(33.34);
  });

  it("so sánh null khi một bên không có quan sát", () => {
    expect(gscGapDoLech(66.67, null)).toBeNull();
    expect(gscGapDoLech(null, 33.33)).toBeNull();
  });
});

describe("normalizeGscChecklistDetailPercents", () => {
  it("tính lại % vi phạm tiêu chí × khoa từ đếm", () => {
    const out = normalizeGscChecklistDetailPercents({
      ma_bk: "BM.01.03",
      ten_bang_kiem: "BK",
      kpis: emptyPayload().kpis,
      trendline: [],
      matrix_khoa: [],
      matrix_criterion: [],
      criterion_khoa: [
        {
          criterion_id: "c1",
          khoa_id: "k1",
          ten: "Nội",
          tong_quan_sat: 3,
          tong_vi_pham: 1,
          ty_le_vi_pham: 33.3,
        },
      ],
      gap_analysis: [],
    });
    expect(out.criterion_khoa[0]?.ty_le_vi_pham).toBe(33.33);
  });
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
