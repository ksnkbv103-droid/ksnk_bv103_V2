import { describe, expect, it } from "vitest";
import {
  isHeatSplitBlockedStation,
  planHeatSplitForBo,
  rejectParentBoScan,
  shouldAutoSplitOnLoaiHeatDowngrade,
} from "./cssd-heat-split";

describe("cssd-heat-split", () => {
  it("detects Cao→Thấp downgrade only", () => {
    expect(shouldAutoSplitOnLoaiHeatDowngrade(true, false)).toBe(true);
    expect(shouldAutoSplitOnLoaiHeatDowngrade(false, true)).toBe(false);
    expect(shouldAutoSplitOnLoaiHeatDowngrade(false, false)).toBe(false);
    expect(shouldAutoSplitOnLoaiHeatDowngrade(null, false)).toBe(false);
  });

  it("plans split only when mixed heat", () => {
    const mixed = planHeatSplitForBo([
      { chiTietId: "a", loaiId: "1", isChiuNhiet: true, ten: "Kéo", soLuong: 1 },
      { chiTietId: "b", loaiId: "2", isChiuNhiet: false, ten: "Ống", soLuong: 1 },
    ]);
    expect(mixed.needsSplit).toBe(true);
    expect(mixed.mainChiTietIds).toEqual(["a"]);
    expect(mixed.subChiTietIds).toEqual(["b"]);

    const allCold = planHeatSplitForBo([
      { chiTietId: "b", loaiId: "2", isChiuNhiet: false, ten: "Ống", soLuong: 2 },
    ]);
    expect(allCold.needsSplit).toBe(false);
  });

  it("blocks TIET_KHUAN / CAP_PHAT", () => {
    expect(isHeatSplitBlockedStation("TIET_KHUAN")).toBe(true);
    expect(isHeatSplitBlockedStation("CAP_PHAT")).toBe(true);
    expect(isHeatSplitBlockedStation("DONG_GOI")).toBe(false);
  });

  it("CSSD-04: rejectParentBoScan chặn mẹ / MAIN", () => {
    expect(rejectParentBoScan({ hasChildComponents: true })).toMatch(/thành phần/);
    expect(rejectParentBoScan({ maVaiTroBo: "MAIN" })).toMatch(/thành phần/);
    expect(rejectParentBoScan({})).toBeNull();
  });
});

describe("cssd-heat-split nhóm EO", () => {
  it("tách thêm nhóm EO khỏi nhóm Plasma và chịu nhiệt", () => {
    const plan = planHeatSplitForBo([
      { chiTietId: "a", loaiId: "1", isChiuNhiet: true, ten: "Kéo", soLuong: 1, phuongPhap: "STEAM_134" },
      { chiTietId: "b", loaiId: "2", isChiuNhiet: false, ten: "Ống soi", soLuong: 1, phuongPhap: "PLASMA" },
      { chiTietId: "c", loaiId: "3", isChiuNhiet: false, ten: "Dây", soLuong: 1, phuongPhap: "EO" },
    ]);
    expect(plan.needsSplit).toBe(true);
    expect(plan.mainChiTietIds).toEqual(["a"]);
    expect(plan.subChiTietIds).toEqual(["b"]);
    expect(plan.eoChiTietIds).toEqual(["c"]);
  });

  it("Plasma + EO không chịu nhiệt vẫn phải tách", () => {
    const plan = planHeatSplitForBo([
      { chiTietId: "b", loaiId: "2", isChiuNhiet: false, ten: "A", soLuong: 1, phuongPhap: "PLASMA" },
      { chiTietId: "c", loaiId: "3", isChiuNhiet: false, ten: "B", soLuong: 1, phuongPhap: "EO" },
    ]);
    expect(plan.needsSplit).toBe(true);
  });

  it("toàn EO không cần tách", () => {
    const plan = planHeatSplitForBo([
      { chiTietId: "c", loaiId: "3", isChiuNhiet: false, ten: "B", soLuong: 1, phuongPhap: "EO" },
    ]);
    expect(plan.needsSplit).toBe(false);
  });
});
