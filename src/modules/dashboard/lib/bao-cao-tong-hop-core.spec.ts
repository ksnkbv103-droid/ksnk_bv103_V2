import { describe, expect, it } from "vitest";
import {
  bucketTrendByMonth,
  bucketTrendByQuarter,
  bucketTrendByYear,
  buildAnalyticsDeepLink,
  buildKhoaRank,
  buildMergedTrend,
  computeCcs,
  computeTyLeGsc,
  computeTyLeVst,
  deltaFromPeriodPoints,
  deltaFromTrend,
  shouldFetchSource,
  topBottomKhoa,
} from "./bao-cao-tong-hop-core";

describe("bao-cao-tong-hop-core", () => {
  it("computeTyLeVst returns null when no opportunities", () => {
    expect(computeTyLeVst({ tong_co_hoi: 0, ty_le_tuan_thu: 0 } as never)).toBeNull();
    expect(computeTyLeVst({ tong_co_hoi: 10, ty_le_tuan_thu: 88 } as never)).toBe(88);
  });

  it("computeCcs weighted average when both present", () => {
    const { value, note } = computeCcs(80, 90);
    expect(value).toBe(85);
    expect(note).toContain("50%");
  });

  it("computeCcs single source fallback", () => {
    const { value, note } = computeCcs(75, null);
    expect(value).toBe(75);
    expect(note).toContain("VST");
  });

  it("deltaFromTrend uses last two points", () => {
    expect(deltaFromTrend([70, 80, 85])).toBe(5);
    expect(deltaFromTrend([80])).toBeNull();
  });

  it("buildMergedTrend merges VST/GSC in same ISO week", () => {
    const trend = buildMergedTrend(
      {
        trendline: [
          {
            label: "T23",
            min_date: "2026-06-02",
            ty_le_tuan_thu: 50,
            tong_co_hoi: 10,
            da_tuan_thu: 5,
          },
        ],
      } as never,
      {
        trendline: [
          {
            label: "T23",
            min_date: "2026-06-04",
            ty_le_tuan_thu: 55,
            tong_quan_sat: 8,
            tong_dat: 4,
          },
        ],
      } as never,
    );
    expect(trend).toHaveLength(1);
    expect(trend[0]?.min_date).toBe("2026-06-01");
    expect(trend[0]?.vst_tong).toBe(10);
    expect(trend[0]?.gsc_tong).toBe(8);
  });

  it("deltaFromPeriodPoints requires two consecutive ISO weeks with volume", () => {
    expect(
      deltaFromPeriodPoints(
        [
          {
            label: "T1",
            min_date: "2026-06-01",
            ty_le_vst: 70,
            ty_le_gsc: null,
            ty_le_ccs: null,
            vst_tong: 10,
            vst_dat: 7,
          },
        ],
        "ty_le_vst",
      ),
    ).toBeNull();

    expect(
      deltaFromPeriodPoints(
        [
          {
            label: "T1",
            min_date: "2026-06-01",
            ty_le_vst: 70,
            ty_le_gsc: null,
            ty_le_ccs: null,
            vst_tong: 10,
            vst_dat: 7,
          },
          {
            label: "T3",
            min_date: "2026-06-15",
            ty_le_vst: 80,
            ty_le_gsc: null,
            ty_le_ccs: null,
            vst_tong: 10,
            vst_dat: 8,
          },
        ],
        "ty_le_vst",
      ),
    ).toBeNull();
  });

  it("deltaFromPeriodPoints compares last two consecutive weeks", () => {
    expect(
      deltaFromPeriodPoints(
        [
          {
            label: "T1",
            min_date: "2026-06-01",
            ty_le_vst: 70,
            ty_le_gsc: null,
            ty_le_ccs: null,
            vst_tong: 10,
            vst_dat: 7,
          },
          {
            label: "T2",
            min_date: "2026-06-08",
            ty_le_vst: 80,
            ty_le_gsc: null,
            ty_le_ccs: null,
            vst_tong: 10,
            vst_dat: 8,
          },
        ],
        "ty_le_vst",
      ),
    ).toBe(10);
  });

  it("bucketTrendByMonth sums volumes not averages percentages", () => {
    const month = bucketTrendByMonth([
      {
        label: "T1",
        min_date: "2026-01-05",
        ty_le_vst: 80,
        ty_le_gsc: 70,
        ty_le_ccs: 75,
        vst_tong: 10,
        vst_dat: 8,
        gsc_tong: 10,
        gsc_dat: 7,
      },
      {
        label: "T2",
        min_date: "2026-01-12",
        ty_le_vst: 50,
        ty_le_gsc: 90,
        ty_le_ccs: 90,
        vst_tong: 2,
        vst_dat: 1,
        gsc_tong: 10,
        gsc_dat: 9,
      },
    ]);
    expect(month).toHaveLength(1);
    expect(month[0]?.ty_le_vst).toBe(75);
    expect(month[0]?.ty_le_gsc).toBe(80);
  });

  it("bucketTrendByMonth aggregates equal weeks", () => {
    const month = bucketTrendByMonth([
      {
        label: "T1",
        min_date: "2026-01-05",
        ty_le_vst: 80,
        ty_le_gsc: 70,
        ty_le_ccs: 75,
        vst_tong: 5,
        vst_dat: 4,
        gsc_tong: 5,
        gsc_dat: 3,
      },
      {
        label: "T2",
        min_date: "2026-01-12",
        ty_le_vst: 90,
        ty_le_gsc: 90,
        ty_le_ccs: 90,
        vst_tong: 5,
        vst_dat: 5,
        gsc_tong: 5,
        gsc_dat: 5,
      },
    ]);
    expect(month).toHaveLength(1);
    expect(month[0]?.ty_le_vst).toBe(90);
    expect(month[0]?.ty_le_gsc).toBe(80);
    expect(month[0]?.ty_le_ccs).toBe(85);
  });

  it("bucketTrendByQuarter aggregates by calendar quarter", () => {
    const q = bucketTrendByQuarter([
      {
        label: "T1",
        min_date: "2026-01-05",
        ty_le_vst: 80,
        ty_le_gsc: 80,
        ty_le_ccs: 80,
        vst_tong: 10,
        vst_dat: 8,
      },
      {
        label: "T2",
        min_date: "2026-02-12",
        ty_le_vst: 90,
        ty_le_gsc: 90,
        ty_le_ccs: 90,
        vst_tong: 10,
        vst_dat: 9,
      },
      {
        label: "T3",
        min_date: "2026-04-01",
        ty_le_vst: 70,
        ty_le_gsc: 70,
        ty_le_ccs: 70,
        vst_tong: 10,
        vst_dat: 7,
      },
    ]);
    expect(q).toHaveLength(2);
    expect(q[0]?.label).toBe("Q1/2026");
    expect(q[0]?.ty_le_vst).toBe(85);
    expect(q[1]?.label).toBe("Q2/2026");
  });

  it("bucketTrendByYear aggregates by calendar year", () => {
    const y = bucketTrendByYear([
      { label: "T1", min_date: "2025-11-05", ty_le_vst: 60, ty_le_gsc: 60, ty_le_ccs: 60 },
      { label: "T2", min_date: "2026-01-12", ty_le_vst: 80, ty_le_gsc: 80, ty_le_ccs: 80 },
    ]);
    expect(y).toHaveLength(2);
    expect(y[0]?.label).toBe("2025");
    expect(y[1]?.label).toBe("2026");
  });

  it("buildKhoaRank merges vst and gsc", () => {
    const rows = buildKhoaRank(
      {
        matrix_khoa: [{ id: "k1", ten: "Khoa A", tong_co_hoi: 10, da_tuan_thu: 8, ty_le_tuan_thu: 80 }],
      } as never,
      {
        matrix_khoa: [{ id: "k1", ten: "Khoa A", tong_quan_sat: 20, tong_dat: 18, ty_le_tuan_thu: 90 }],
      } as never,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ty_le_avg).toBe(85);
  });

  it("topBottomKhoa orders by avg", () => {
    const { top, bottom } = topBottomKhoa(
      [
        { id: "1", ten: "A", ty_le_avg: 90, ty_le_vst: 90, ty_le_gsc: null, tong_co_hoi_vst: 1, tong_quan_sat_gsc: 0 },
        { id: "2", ten: "B", ty_le_avg: 50, ty_le_vst: 50, ty_le_gsc: null, tong_co_hoi_vst: 1, tong_quan_sat_gsc: 0 },
      ],
      1,
    );
    expect(top[0].ten).toBe("A");
    expect(bottom[0].ten).toBe("B");
  });

  it("shouldFetchSource respects chuyen_de", () => {
    expect(shouldFetchSource("ALL", "VST")).toBe(true);
    expect(shouldFetchSource("GSC", "VST")).toBe(false);
    expect(shouldFetchSource("NKBV", "NKBV")).toBe(true);
  });

  it("buildAnalyticsDeepLink includes tab and filters", () => {
    const href = buildAnalyticsDeepLink(
      "/giam-sat-chung",
      { tu_ngay: "2026-01-01", den_ngay: "2026-01-31", khoa_ids: ["k1"] },
      "analytics",
    );
    expect(href).toContain("tab=analytics");
    expect(href).toContain("tu_ngay=2026-01-01");
    expect(href).toContain("khoa_ids=k1");
  });
});
