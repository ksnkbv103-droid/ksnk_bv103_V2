import { describe, expect, it } from "vitest";
import {
  buildCoverageMatrix,
  buildGapKhoaRows,
  countKsnkCoveredKhoa,
  countTgsCoveredKhoa,
  coverageCellStatus,
  gapExclusionReason,
  gapRowVolTotal,
  isGapComparable,
  KHOA_COMPLIANCE_WARN_PCT,
  mergeMasterGapRows,
  normalizeGapKhoaRow,
  partitionGapKhoaRows,
  resolveKhoaAggregateTyLe,
  sortGapRowsByAggregateTyLe,
  sortGapRowsByMetric,
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
      tgs_dat: 8,
      ksnk_co_hoi: 5,
      ksnk_dat: 4,
    });
    expect(row.label).toBe("B01");
    expect(row.vol_tgs).toBe(10);
    expect(row.vol_ksnk).toBe(5);
    expect(row.dat_tgs).toBe(8);
    expect(row.dat_ksnk).toBe(4);
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

  it("sortGapRowsByMetric sorts percent asc with nulls last", () => {
    const rows = [
      normalizeGapKhoaRow({ id: "a", ten: "A", ma_khoa: "A1", ty_le_ksnk: 90, ksnk_co_hoi: 1, ksnk_dat: 1 }),
      normalizeGapKhoaRow({ id: "b", ten: "B", ma_khoa: "B1", ty_le_ksnk: 40, ksnk_co_hoi: 1, ksnk_dat: 1 }),
      normalizeGapKhoaRow({ id: "c", ten: "C", ma_khoa: "C1", ty_le_ksnk: null, ksnk_co_hoi: 0 }),
    ];
    const sorted = sortGapRowsByMetric(rows, "ty_le_ksnk", "asc");
    expect(sorted.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("sortGapRowsByMetric sorts percent desc", () => {
    const rows = [
      normalizeGapKhoaRow({ id: "a", ten: "A", ma_khoa: "A1", ty_le_ksnk: 90, ksnk_co_hoi: 1, ksnk_dat: 1 }),
      normalizeGapKhoaRow({ id: "b", ten: "B", ma_khoa: "B1", ty_le_ksnk: 40, ksnk_co_hoi: 1, ksnk_dat: 1 }),
    ];
    expect(sortGapRowsByMetric(rows, "ty_le_ksnk", "desc").map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("sortGapRowsByMetric sorts vol_total desc", () => {
    const rows = [
      normalizeGapKhoaRow({ id: "a", ten: "A", ma_khoa: "A1", ksnk_co_hoi: 2, ksnk_dat: 1, tgs_co_hoi: 1, tgs_dat: 1 }),
      normalizeGapKhoaRow({ id: "b", ten: "B", ma_khoa: "B1", ksnk_co_hoi: 5, ksnk_dat: 3 }),
      normalizeGapKhoaRow({ id: "c", ten: "C", ma_khoa: "C1", ksnk_co_hoi: 0, tgs_co_hoi: 10, tgs_dat: 8 }),
    ];
    expect(gapRowVolTotal(rows[0])).toBe(3);
    expect(sortGapRowsByMetric(rows, "vol_total", "desc").map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("sortGapRowsByAggregateTyLe sorts desc with matrix fallback", () => {
    const rows = [
      normalizeGapKhoaRow({ id: "k1", ten: "K1", ma_khoa: "K1", ty_le_ksnk: null, ksnk_co_hoi: 0 }),
      normalizeGapKhoaRow({ id: "k2", ten: "K2", ma_khoa: "K2", ty_le_ksnk: 60, ksnk_co_hoi: 1, ksnk_dat: 1 }),
      normalizeGapKhoaRow({ id: "k3", ten: "K3", ma_khoa: "K3", ty_le_ksnk: 90, ksnk_co_hoi: 1, ksnk_dat: 1 }),
    ];
    const matrix = [{ id: "k1", ma_khoa: "K1", ty_le_tuan_thu: 75 }];
    expect(sortGapRowsByAggregateTyLe(rows, matrix, "desc").map((r) => r.id)).toEqual(["k3", "k1", "k2"]);
  });

  it("buildGapKhoaRows adds placeholder for filtered khoa without gap data", () => {
    const rows = buildGapKhoaRows(
      [{ id: "k1", ten: "Khoa A", ma_khoa: "B01", ty_le_ksnk: 88, ksnk_co_hoi: 3, ksnk_dat: 2 }],
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
    expect(rows.find((r) => r.id === "k2")?.label).toBe("B02");
  });

  it("buildGapKhoaRows includes all khoa options when filter is all khoa", () => {
    const rows = buildGapKhoaRows(
      [{ id: "k1", ten: "Khoa A", ma_khoa: "B01", ty_le_ksnk: 88, ksnk_co_hoi: 3, ksnk_dat: 2 }],
      ["k1", "k2", "k3"],
      [
        { id: "k1", label: "Khoa A (B01)" },
        { id: "k2", label: "Khoa B (B02)" },
        { id: "k3", label: "Khoa C (B03)" },
      ],
      3,
    );
    expect(rows).toHaveLength(3);
    expect(rows.find((r) => r.id === "k3")?.vol_ksnk).toBe(0);
    expect(rows.find((r) => r.id === "k3")?.label).toBe("B03");
  });

  it("countKsnkCoveredKhoa counts khoa with KSNK volume", () => {
    expect(
      countKsnkCoveredKhoa([
        {
          id: "1",
          ten: "A",
          label: "A",
          ty_le_tgs: null,
          ty_le_ksnk: 80,
          vol_tgs: 0,
          vol_ksnk: 5,
          dat_tgs: 0,
          dat_ksnk: 4,
        },
        {
          id: "2",
          ten: "B",
          label: "B",
          ty_le_tgs: null,
          ty_le_ksnk: null,
          vol_tgs: 0,
          vol_ksnk: 0,
          dat_tgs: 0,
          dat_ksnk: 0,
        },
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
    const row = {
      id: "1",
      ten: "A",
      label: "A",
      ty_le_tgs: 80,
      ty_le_ksnk: null,
      vol_tgs: 3,
      vol_ksnk: 0,
      dat_tgs: 2,
      dat_ksnk: 0,
    };
    expect(countTgsCoveredKhoa([row])).toEqual({ covered: 1, total: 1 });
    expect(coverageCellStatus(row)).toBe("tgs_only");
    const matrix = buildCoverageMatrix([{ id: "vst", label: "VST", rows: [row] }]);
    expect(matrix.khoaRows).toHaveLength(1);
  });

  it("KHOA_COMPLIANCE_WARN_PCT is 80 for dashboard highlight", () => {
    expect(KHOA_COMPLIANCE_WARN_PCT).toBe(80);
  });

  it("resolveKhoaAggregateTyLe prefers KSNK then TGS then matrix aggregate", () => {
    const row = normalizeGapKhoaRow({
      id: "k1",
      ten: "Khoa A",
      ma_khoa: "A01",
      ty_le_ksnk: 88,
      ty_le_tgs: 70,
      ksnk_co_hoi: 5,
    });
    expect(resolveKhoaAggregateTyLe(row, 60)).toBe(88);
    expect(
      resolveKhoaAggregateTyLe(
        { ...row, ty_le_ksnk: null, ty_le_tgs: 72 },
        60,
      ),
    ).toBe(72);
    expect(
      resolveKhoaAggregateTyLe(
        { ...row, ty_le_ksnk: null, ty_le_tgs: null },
        65.555,
      ),
    ).toBe(65.56);
  });

  it("mergeMasterGapRows combines VST and GSC volumes per khoa", () => {
    const vst = normalizeGapKhoaRow({
      id: "k1",
      ten: "Khoa A",
      ma_khoa: "A01",
      ty_le_ksnk: 90,
      ksnk_co_hoi: 10,
      ksnk_dat: 9,
      tgs_co_hoi: 0,
    });
    const gsc = normalizeGapKhoaRow({
      id: "k1",
      ten: "Khoa A",
      ma_khoa: "A01",
      ty_le_tgs: 80,
      tgs_quan_sat: 5,
      tgs_dat: 4,
      ksnk_quan_sat: 0,
    });
    const merged = mergeMasterGapRows([vst], [gsc]);
    expect(merged).toHaveLength(1);
    expect(merged[0].vol_ksnk).toBe(10);
    expect(merged[0].vol_tgs).toBe(5);
    expect(merged[0].ty_le_ksnk).toBe(90);
    expect(merged[0].ty_le_tgs).toBe(80);
  });
});
