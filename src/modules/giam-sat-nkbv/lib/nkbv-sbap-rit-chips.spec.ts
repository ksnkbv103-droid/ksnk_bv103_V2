import { describe, expect, it } from "vitest";
import { buildSbapRitChips, isBloodSpecimen, isSameSpecimenGroup } from "./nkbv-sbap-rit-chips";
import type { BaGridXnCell } from "./nkbv-ba-grid-engine";

const xnCell = (o: Partial<BaGridXnCell> & { id: string; ngay: string }): BaGridXnCell => ({
  benh_pham: "Nước tiểu",
  vi_khuan: "E. coli",
  so_luong: null,
  source: "LIS",
  ...o,
});

describe("nkbv-sbap-rit-chips", () => {
  it("nhận diện bệnh phẩm máu (có dấu / không dấu / tiếng Anh)", () => {
    expect(isBloodSpecimen("Máu")).toBe(true);
    expect(isBloodSpecimen("Cấy mau ngoại vi")).toBe(true);
    expect(isBloodSpecimen("Blood culture")).toBe(true);
    expect(isBloodSpecimen("Nước tiểu")).toBe(false);
  });

  it("cùng nhóm bệnh phẩm: nước tiểu↔nước tiểu; máu không tính", () => {
    expect(isSameSpecimenGroup("Nước tiểu", "Nước tiểu giữa dòng")).toBe(true);
    expect(isSameSpecimenGroup("Đờm", "Dịch rửa phế quản")).toBe(true);
    expect(isSameSpecimenGroup("Nước tiểu", "Đờm")).toBe(false);
    expect(isSameSpecimenGroup("Máu", "Máu")).toBe(false);
  });

  it("BA-DEMO-03 kịch bản: máu → SBAP, nước tiểu lặp → RIT, Index không lặp lại", () => {
    // Khớp seed: XN-D03-U1 (22/7 Index) · XN-D03-B1 (22/7 SBAP) · XN-D03-U2 (25/7 RIT)
    const indexUrine = xnCell({ id: "u1", ngay: "2026-07-22", benh_pham: "Nước tiểu" });
    const repeatUrine = xnCell({ id: "u2", ngay: "2026-07-25", benh_pham: "Nước tiểu" });
    const blood = xnCell({ id: "b1", ngay: "2026-07-22", benh_pham: "Máu" });
    const sputumSameDay = xnCell({ id: "s1", ngay: "2026-07-25", benh_pham: "Đờm" });

    const chips = buildSbapRitChips({
      xn: [indexUrine, repeatUrine, blood, sputumSameDay],
      indexId: "u1",
      indexSpecimen: "Nước tiểu",
      ritDates: new Set(["2026-07-22", "2026-07-25"]),
      sbapDates: new Set(["2026-07-22"]),
    });

    expect(chips.sbapByDate["2026-07-22"]?.map((x) => x.id)).toEqual(["b1"]);
    // Index gốc không thành chip RIT; đờm khác nhóm bệnh phẩm bị loại
    expect(chips.ritByDate["2026-07-25"]?.map((x) => x.id)).toEqual(["u2"]);
    expect(chips.ritByDate["2026-07-22"]).toBeUndefined();
  });

  it("máu ngoài cửa sổ SBAP và cấy ngoài RIT không thành chip", () => {
    const blood = xnCell({ id: "b1", ngay: "2026-07-10", benh_pham: "Máu" });
    const urineLate = xnCell({ id: "u9", ngay: "2026-08-20", benh_pham: "Nước tiểu" });
    const chips = buildSbapRitChips({
      xn: [blood, urineLate],
      indexId: "u1",
      indexSpecimen: "Nước tiểu",
      ritDates: new Set(["2026-07-20"]),
      sbapDates: new Set(["2026-07-22"]),
    });
    expect(Object.keys(chips.sbapByDate)).toHaveLength(0);
    expect(Object.keys(chips.ritByDate)).toHaveLength(0);
  });
});
