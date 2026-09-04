import { describe, expect, it } from "vitest";
import {
  bkTrendDataKey,
  mergeMultiChuyenDeTrendRows,
  toChuyenDeTrendSeries,
} from "./chuyen-de-trend-series";

describe("chuyen-de-trend-series", () => {
  it("bkTrendDataKey sanitizes mã BK", () => {
    expect(bkTrendDataKey("BK-01/A")).toBe("bk_BK-01_A");
  });

  it("mergeMultiChuyenDeTrendRows builds one column per BK and skips empty weeks", () => {
    const s1 = toChuyenDeTrendSeries("BK01", "Tay", [
      { label: "T1", min_date: "2026-01-05", tong_quan_sat: 10, tong_dat: 8, ty_le_tuan_thu: 80 },
      { label: "T2", min_date: "2026-01-12", tong_quan_sat: 0, tong_dat: 0, ty_le_tuan_thu: null },
    ]);
    const s2 = toChuyenDeTrendSeries("BK02", "Mặt", [
      { label: "T1", min_date: "2026-01-05", tong_quan_sat: 20, tong_dat: 10, ty_le_tuan_thu: 50 },
    ]);
    const rows = mergeMultiChuyenDeTrendRows([s1, s2], "week");
    expect(rows).toHaveLength(1);
    expect(rows[0]![s1.dataKey]).toBe(80);
    expect(rows[0]![s2.dataKey]).toBe(50);
  });

  it("uses GSC 2-decimal rate from counts (2/3 → 66.67)", () => {
    const s = toChuyenDeTrendSeries("BK03", "Gói", [
      { label: "T1", min_date: "2026-01-05", tong_quan_sat: 3, tong_dat: 2, ty_le_tuan_thu: 66.7 },
    ]);
    const rows = mergeMultiChuyenDeTrendRows([s], "week");
    expect(rows[0]![s.dataKey]).toBe(66.67);
  });
});
