import { describe, expect, it } from "vitest";
import {
  buildCoverageMatrix,
  buildGapKhoaRows,
  countKsnkCoveredKhoa,
  countTgsCoveredKhoa,
  coverageCellStatus,
  gapExclusionReason,
  isGapComparable,
  normalizeGapKhoaRow,
  partitionGapKhoaRows,
} from "./supervision-matrix-mappers";

describe("supervision-matrix-mappers", () => {
  it("normalizeGapKhoaRow maps VST volume fields", () => {
    const row = normalizeGapKhoaRow({
      id: "k1",
      ten: "Khoa A",
      ma_khoa: "B01",
      ty_le_tgs: 80,
      ty_le_ksnk: 90,
      tgs_co_hoi: 10,
      ksnk_co_hoi: 5,
    });
    expect(row.label).toBe("B01");
    expect(row.vol_tgs).toBe(10);
    expect(row.vol_ksnk).toBe(5);
  });

  it("normalizeGapKhoaRow maps GSC volume fields", () => {
    const row = normalizeGapKhoaRow({
      id: "k2",
      ten: "Khoa B",
      ma_khoa: "B02",
      ty_le_tgs: 70,
      ty_le_ksnk: null,
      tgs_quan_sat: 20,
      ksnk_quan_sat: 0,
    });
    expect(row.vol_tgs).toBe(20);
    expect(row.vol_ksnk).toBe(0);
  });

  it("buildGapKhoaRows adds placeholder for filtered khoa without gap data", () => {
    const rows = buildGapKhoaRows(
      [{ id: "k1", ten: "Khoa A", ma_khoa: "B01", ty_le_ksnk: 88, ksnk_co_hoi: 3 }],
      ["k1", "k2"],
      [
        { id: "k1", label: "Khoa A (B01)" },
        { id: "k2", label: "Khoa B (B02)" },
        { id: "k3", label: "Khoa C (B03)" },
      ],
      3,
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === "k2")?.vol_ksnk).toBe(0);
  });

  it("countKsnkCoveredKhoa counts khoa with KSNK volume", () => {
    expect(
      countKsnkCoveredKhoa([
        { id: "1", ten: "A", label: "A", ty_le_tgs: null, ty_le_ksnk: 80, vol_tgs: 0, vol_ksnk: 5 },
        { id: "2", ten: "B", label: "B", ty_le_tgs: null, ty_le_ksnk: null, vol_tgs: 0, vol_ksnk: 0 },
      ]),
    ).toEqual({ covered: 1, total: 2 });
  });

  it("isGapComparable requires both TGS and KSNK volume", () => {
    const ksnkOnly = normalizeGapKhoaRow({
      id: "k1",
      ten: "Khoa A",
      ma_khoa: "B01",
      ty_le_ksnk: 90,
      ksnk_co_hoi: 5,
      ty_le_tgs: null,
      tgs_co_hoi: 0,
    });
    const both = normalizeGapKhoaRow({
      id: "k2",
      ten: "Khoa B",
      ma_khoa: "B02",
      ty_le_tgs: 80,
      ty_le_ksnk: 85,
      tgs_co_hoi: 10,
      ksnk_co_hoi: 8,
    });
    expect(isGapComparable(ksnkOnly)).toBe(false);
    expect(isGapComparable(both)).toBe(true);
    expect(gapExclusionReason(ksnkOnly)).toBe("Chưa TGS");
    expect(gapExclusionReason(both)).toBeNull();
  });

  it("partitionGapKhoaRows splits comparable and excluded", () => {
    const rows = buildGapKhoaRows(
      [
        { id: "k1", ten: "A", ma_khoa: "B01", ty_le_ksnk: 90, ksnk_co_hoi: 5 },
        { id: "k2", ten: "B", ma_khoa: "B02", ty_le_tgs: 70, ty_le_ksnk: 80, tgs_co_hoi: 10, ksnk_co_hoi: 8 },
      ],
      [],
      [],
      0,
    );
    const { comparable, excluded } = partitionGapKhoaRows(rows);
    expect(comparable).toHaveLength(1);
    expect(excluded).toHaveLength(1);
    expect(excluded[0]?.id).toBe("k1");
  });

  it("countTgsCoveredKhoa and coverageCellStatus", () => {
    const row = { id: "1", ten: "A", label: "A", ty_le_tgs: 80, ty_le_ksnk: null, vol_tgs: 3, vol_ksnk: 0 };
    expect(countTgsCoveredKhoa([row])).toEqual({ covered: 1, total: 1 });
    expect(coverageCellStatus(row)).toBe("tgs_only");
    const matrix = buildCoverageMatrix([{ id: "vst", label: "VST", rows: [row] }]);
    expect(matrix.khoaRows).toHaveLength(1);
  });
});
