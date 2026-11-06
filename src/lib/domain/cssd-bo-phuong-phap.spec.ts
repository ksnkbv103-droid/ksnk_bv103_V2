import { describe, expect, it } from "vitest";
import { intersectPhuongPhapBo } from "./cssd-bo-phuong-phap";

describe("intersectPhuongPhapBo", () => {
  it("rỗng khi bộ chưa có loại", () => {
    expect(intersectPhuongPhapBo([])).toEqual([]);
  });
  it("giữ thứ tự ưu tiên của loại đầu", () => {
    expect(intersectPhuongPhapBo([["STEAM_134", "PLASMA", "EO"], ["EO", "PLASMA"]])).toEqual(["PLASMA", "EO"]);
  });
  it("giao rỗng khi nhựa chỉ Plasma và kim loại chỉ hơi", () => {
    expect(intersectPhuongPhapBo([["PLASMA"], ["STEAM_134"]])).toEqual([]);
  });
});
