import { describe, expect, it } from "vitest";
import {
  buildSbapRitChips,
  isBloodSpecimen,
  isSameSpecimenGroup,
  resolveIndexSpecimenForChips,
  specimenHintForPanel,
} from "./nkbv-sbap-rit-chips";
import type { BaGridCdhaCell, BaGridXnCell } from "./nkbv-ba-grid-engine";

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

  it("specimenHintForPanel + resolveIndexSpecimenForChips khi Index = CĐHA", () => {
    expect(specimenHintForPanel("PNEU")).toBe("Đờm");
    expect(specimenHintForPanel("UTI")).toBe("Nước tiểu");
    expect(
      resolveIndexSpecimenForChips({ panel: "PNEU", indexXnBenhPham: null }),
    ).toBe("Đờm");
    expect(
      resolveIndexSpecimenForChips({
        panel: "PNEU",
        indexXnBenhPham: "Đờm ETA",
      }),
    ).toBe("Đờm ETA");
  });

  it("BA-DEMO-03 kịch bản: máu → SBAP, nước tiểu lặp → RIT, Index không lặp lại", () => {
    const indexUrine = xnCell({
      id: "u1",
      ngay: "2026-07-22",
      benh_pham: "Nước tiểu",
      vi_khuan: "Escherichia coli",
    });
    const repeatUrine = xnCell({
      id: "u2",
      ngay: "2026-07-25",
      benh_pham: "Nước tiểu",
      vi_khuan: "Escherichia coli",
    });
    const blood = xnCell({
      id: "b1",
      ngay: "2026-07-22",
      benh_pham: "Máu",
      vi_khuan: "Escherichia coli",
    });
    const sputumSameDay = xnCell({ id: "s1", ngay: "2026-07-25", benh_pham: "Đờm" });

    const chips = buildSbapRitChips({
      xn: [indexUrine, repeatUrine, blood, sputumSameDay],
      indexId: "u1",
      indexSpecimen: "Nước tiểu",
      ritDates: new Set(["2026-07-22", "2026-07-25"]),
      sbapDates: new Set(["2026-07-22"]),
      primaryOrganisms: ["Escherichia coli"],
    });

    expect(chips.sbapByDate["2026-07-22"]?.map((x) => x.id)).toEqual(["b1"]);
    expect(chips.sbapByDate["2026-07-22"]?.[0]?.organismMatched).toBe(true);
    expect(chips.ritByDate["2026-07-25"]?.map((x) => x.id)).toEqual(["u2"]);
    expect(chips.ritByDate["2026-07-22"]).toBeUndefined();
  });

  it("Index CĐHA + hint Đờm → kéo đờm ∈ RIT; XQ khác ∈ ritCdhaByDate", () => {
    const sputum = xnCell({
      id: "s1",
      ngay: "2026-07-20",
      benh_pham: "Đờm",
      vi_khuan: "K. pneumoniae",
    });
    const cdhaOther: BaGridCdhaCell = {
      id: "xq-2",
      ngay: "2026-07-21",
      loai: "XQ",
      mo_ta_benh_ly: "XQ tiến triển",
      tieu_chuan_key: "imaging_chest",
    };
    const chips = buildSbapRitChips({
      xn: [sputum],
      cdha: [
        {
          id: "xq-1",
          ngay: "2026-07-19",
          loai: "XQ",
          mo_ta_benh_ly: "Index XQ",
          tieu_chuan_key: "imaging_chest",
        },
        cdhaOther,
      ],
      indexId: "xq-1",
      indexSpecimen: resolveIndexSpecimenForChips({ panel: "PNEU" }),
      ritDates: new Set(["2026-07-19", "2026-07-20", "2026-07-21"]),
      sbapDates: new Set(["2026-07-19"]),
    });
    expect(chips.ritByDate["2026-07-20"]?.map((x) => x.id)).toEqual(["s1"]);
    expect(chips.ritCdhaByDate["2026-07-21"]?.map((c) => c.id)).toEqual(["xq-2"]);
    expect(chips.ritCdhaByDate["2026-07-19"]).toBeUndefined();
  });

  it("máu trùng VK → organismMatched; máu khác VK vẫn hiện nhưng unmatched", () => {
    const match = xnCell({
      id: "b1",
      ngay: "2026-07-22",
      benh_pham: "Máu",
      vi_khuan: "Escherichia coli",
    });
    const other = xnCell({
      id: "b2",
      ngay: "2026-07-22",
      benh_pham: "Máu",
      vi_khuan: "Staphylococcus aureus",
    });
    const chips = buildSbapRitChips({
      xn: [match, other],
      indexId: "u1",
      indexSpecimen: "Nước tiểu",
      ritDates: new Set(["2026-07-22"]),
      sbapDates: new Set(["2026-07-22"]),
      primaryOrganisms: ["Escherichia coli"],
    });
    const byId = Object.fromEntries(
      (chips.sbapByDate["2026-07-22"] || []).map((x) => [x.id, x.organismMatched]),
    );
    expect(byId.b1).toBe(true);
    expect(byId.b2).toBe(false);
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
