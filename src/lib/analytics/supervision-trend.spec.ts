import { describe, expect, it } from "vitest";
import {
  bucketSupervisionTrendByMonth,
  bucketSupervisionTrendByQuarter,
  bucketSupervisionTrendByYear,
  normalizeGscTrendline,
  normalizeVstTrendline,
  pickSupervisionTrend,
} from "./supervision-trend";

describe("supervision-trend", () => {
  const vstWeeks = normalizeVstTrendline([
    {
      label: "Tuần 23",
      min_date: "2026-06-02",
      tong_co_hoi: 10,
      da_tuan_thu: 8,
      ty_le_tuan_thu: 80,
    },
    {
      label: "Tuần 24",
      min_date: "2026-06-09",
      tong_co_hoi: 20,
      da_tuan_thu: 10,
      ty_le_tuan_thu: 50,
    },
  ]);

  it("normalizeVstTrendline preserves weekly volumes", () => {
    expect(vstWeeks).toHaveLength(2);
    expect(vstWeeks[0]?.tong).toBe(10);
    expect(vstWeeks[0]?.dat).toBe(8);
    expect(vstWeeks[0]?.ty_le_tuan_thu).toBe(80);
  });

  it("normalizeGscTrendline maps quan_sat/dat fields", () => {
    const rows = normalizeGscTrendline([
      {
        label: "Tuần 1",
        min_date: "2026-01-06",
        tong_quan_sat: 6,
        tong_dat: 3,
        ty_le_tuan_thu: 50,
      },
    ]);
    expect(rows[0]?.tong).toBe(6);
    expect(rows[0]?.dat).toBe(3);
    expect(rows[0]?.ty_le_tuan_thu).toBe(50);
  });

  it("bucketSupervisionTrendByMonth sums volumes not averages percentages", () => {
    const month = bucketSupervisionTrendByMonth(vstWeeks);
    expect(month).toHaveLength(1);
    expect(month[0]?.tong).toBe(30);
    expect(month[0]?.dat).toBe(18);
    expect(month[0]?.ty_le_tuan_thu).toBe(60);
  });

  it("bucketSupervisionTrendByQuarter aggregates by calendar quarter", () => {
    const q = bucketSupervisionTrendByQuarter(
      normalizeVstTrendline([
        {
          label: "T1",
          min_date: "2026-01-06",
          tong_co_hoi: 10,
          da_tuan_thu: 5,
          ty_le_tuan_thu: 50,
        },
        {
          label: "T2",
          min_date: "2026-02-10",
          tong_co_hoi: 10,
          da_tuan_thu: 8,
          ty_le_tuan_thu: 80,
        },
      ]),
    );
    expect(q).toHaveLength(1);
    expect(q[0]?.label).toBe("Q1/2026");
    expect(q[0]?.ty_le_tuan_thu).toBe(65);
  });

  it("bucketSupervisionTrendByYear aggregates by calendar year", () => {
    const y = bucketSupervisionTrendByYear(
      normalizeVstTrendline([
        {
          label: "T1",
          min_date: "2026-01-06",
          tong_co_hoi: 10,
          da_tuan_thu: 5,
          ty_le_tuan_thu: 50,
        },
        {
          label: "T2",
          min_date: "2026-12-01",
          tong_co_hoi: 10,
          da_tuan_thu: 9,
          ty_le_tuan_thu: 90,
        },
      ]),
    );
    expect(y).toHaveLength(1);
    expect(y[0]?.label).toBe("2026");
    expect(y[0]?.ty_le_tuan_thu).toBe(70);
  });

  it("pickSupervisionTrend returns weekly points by default", () => {
    expect(pickSupervisionTrend(vstWeeks, "week")).toHaveLength(2);
    expect(pickSupervisionTrend(vstWeeks, "month")).toHaveLength(1);
    expect(pickSupervisionTrend(vstWeeks, "year")).toHaveLength(1);
  });

  it("VST 2/3 is 66.7; GSC 2/3 is 66.67", () => {
    const vst = normalizeVstTrendline([
      { label: "T", min_date: "2026-01-06", tong_co_hoi: 3, da_tuan_thu: 2, ty_le_tuan_thu: 0 },
    ]);
    const gsc = normalizeGscTrendline([
      { label: "T", min_date: "2026-01-06", tong_quan_sat: 3, tong_dat: 2, ty_le_tuan_thu: 0 },
    ]);
    expect(vst[0]?.ty_le_tuan_thu).toBe(66.7);
    expect(gsc[0]?.ty_le_tuan_thu).toBe(66.67);
  });
});
