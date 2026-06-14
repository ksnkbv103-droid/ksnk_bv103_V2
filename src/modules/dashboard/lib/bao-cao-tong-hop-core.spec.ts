import { describe, expect, it } from "vitest";
import {
  bucketTrendByMonth,
  bucketTrendByQuarter,
  bucketTrendByYear,
  buildAnalyticsDeepLink,
  buildBaoCaoReportNo,
  buildKhoaRank,
  buildMergedTrend,
  computeCcs,
  formatBaoCaoIsoDateVi,
  formatBaoCaoIssueDateVi,
  mergeKhoaRankWithSelected,
  sortKhoaRankByCcs,
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
    expect(rows[0].ty_le_ccs).toBe(85);
  });

  it("sortKhoaRankByCcs ranks by CCS and puts no-data last", () => {
    const sorted = sortKhoaRankByCcs([
      {
        id: "1",
        ten: "A",
        ty_le_avg: 50,
        ty_le_ccs: 50,
        ty_le_vst: 50,
        ty_le_gsc: null,
        tong_co_hoi_vst: 1,
        tong_quan_sat_gsc: 0,
        has_data: true,
      },
      {
        id: "2",
        ten: "B",
        ty_le_avg: 90,
        ty_le_ccs: 90,
        ty_le_vst: 90,
        ty_le_gsc: null,
        tong_co_hoi_vst: 1,
        tong_quan_sat_gsc: 0,
        has_data: true,
      },
      {
        id: "3",
        ten: "C",
        ty_le_avg: null,
        ty_le_ccs: null,
        ty_le_vst: null,
        ty_le_gsc: null,
        tong_co_hoi_vst: 0,
        tong_quan_sat_gsc: 0,
        has_data: false,
      },
    ]);
    expect(sorted.map((r) => r.ten)).toEqual(["B", "A", "C"]);
  });

  it("mergeKhoaRankWithSelected adds placeholder for filtered khoa without sessions", () => {
    const merged = mergeKhoaRankWithSelected(
      [
        {
          id: "k1",
          ten: "Khoa A",
          ty_le_avg: 80,
          ty_le_ccs: 80,
          ty_le_vst: 80,
          ty_le_gsc: null,
          tong_co_hoi_vst: 10,
          tong_quan_sat_gsc: 0,
        },
      ],
      ["k1", "k2"],
      [
        { id: "k1", label: "Khoa A" },
        { id: "k2", label: "Khoa B" },
        { id: "k3", label: "Khoa C" },
      ],
      3,
    );
    expect(merged).toHaveLength(2);
    expect(merged[0].ten).toBe("Khoa A");
    expect(merged[1]).toMatchObject({ id: "k2", ten: "Khoa B", has_data: false, ty_le_ccs: null });
  });

  it("topBottomKhoa orders by avg", () => {
    const { top, bottom } = topBottomKhoa(
      [
        {
          id: "1",
          ten: "A",
          ty_le_avg: 90,
          ty_le_ccs: 90,
          ty_le_vst: 90,
          ty_le_gsc: null,
          tong_co_hoi_vst: 1,
          tong_quan_sat_gsc: 0,
        },
        {
          id: "2",
          ten: "B",
          ty_le_avg: 50,
          ty_le_ccs: 50,
          ty_le_vst: 50,
          ty_le_gsc: null,
          tong_co_hoi_vst: 1,
          tong_quan_sat_gsc: 0,
        },
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

  it("buildAnalyticsDeepLink maps supervision modules to /thong-ke canonical routes", () => {
    const href = buildAnalyticsDeepLink(
      "/giam-sat-chung",
      { tu_ngay: "2026-01-01", den_ngay: "2026-01-31", khoa_ids: ["k1"] },
      "analytics",
    );
    expect(href).toMatch(/^\/thong-ke\/gsc\?/);
    expect(href).toContain("tu_ngay=2026-01-01");
    expect(href).toContain("khoa_ids=k1");
    expect(href).not.toContain("tab=analytics");
  });

  it("formatBaoCaoIsoDateVi formats ISO to dd/mm/yyyy", () => {
    expect(formatBaoCaoIsoDateVi("2026-06-01")).toBe("01/06/2026");
    expect(formatBaoCaoIsoDateVi("invalid")).toBe("invalid");
  });

  it("formatBaoCaoIssueDateVi uses Vietnamese issue line", () => {
    expect(formatBaoCaoIssueDateVi(new Date(2026, 5, 14))).toBe("Hà Nội, ngày 14 tháng 6 năm 2026");
  });

  it("buildBaoCaoReportNo encodes period in report code", () => {
    expect(buildBaoCaoReportNo("2026-06-01", "2026-06-30")).toBe("BC-TH-20260601-20260630");
  });

  it("buildAnalyticsDeepLink preserves GSC analytics view param", () => {
    const href = buildAnalyticsDeepLink(
      "/giam-sat-chung",
      { tu_ngay: "2026-01-01", den_ngay: "2026-01-31", khoa_ids: ["k1"], view: "bk-toi" },
      "analytics",
    );
    expect(href).toContain("view=bk-toi");
    expect(href).toContain("khoa_ids=k1");
  });
});
