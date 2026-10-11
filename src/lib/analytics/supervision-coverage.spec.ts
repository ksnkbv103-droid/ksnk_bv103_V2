import { describe, expect, it } from "vitest";
import { buildCoverageSummary } from "./supervision-coverage";
import type { GapKhoaRow } from "./supervision-matrix-mappers";

const row = (id: string, vol_tgs: number, vol_ksnk: number): GapKhoaRow => ({
  id,
  ten: `Khoa ${id}`,
  label: `K${id}`,
  ty_le_tgs: null,
  ty_le_ksnk: null,
  vol_tgs,
  vol_ksnk,
  dat_tgs: 0,
  dat_ksnk: 0,
});

describe("buildCoverageSummary", () => {
  it("không có khoa → pct null", () => {
    expect(buildCoverageSummary([]).pct).toBeNull();
  });

  it("đếm khoa có ít nhất một nguồn, tách TGS/KSNK, liệt kê khoa chưa phủ", () => {
    const s = buildCoverageSummary([row("B", 5, 0), row("A", 0, 3), row("D", 2, 2), row("C", 0, 0)]);
    expect(s).toMatchObject({ total: 4, covered: 3, tgsCovered: 2, ksnkCovered: 2, pct: 75 });
    expect(s.uncovered).toEqual(["KC"]);
  });
});
