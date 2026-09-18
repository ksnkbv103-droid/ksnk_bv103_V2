import { describe, expect, it } from "vitest";
import {
  isHeatSplitBlockedStation,
  planHeatSplitForBo,
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
});
