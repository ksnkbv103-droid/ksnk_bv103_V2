import { describe, expect, it } from "vitest";
import {
  pickBangKiemOptionIdsWithSessionData,
  sortedJoinIds,
  effectiveFilterIds,
} from "./dashboard-hook-helpers";

describe("dashboard-hook-helpers", () => {
  it("sortedJoinIds is stable", () => {
    expect(sortedJoinIds(["b", "a"])).toBe("a\u0001b");
  });

  it("effectiveFilterIds returns null when all selected", () => {
    expect(effectiveFilterIds(["1", "2"], 2)).toBeNull();
  });

  it("pickBangKiemOptionIdsWithSessionData filters empty BK", () => {
    const opts = [
      { id: "BK_A", label: "A" },
      { id: "BK_B", label: "B" },
    ];
    const summary = [
      { ma_bk: "BK_A", ten_bk: "A", tong: 1, ksnk: 0, tu_gs: 0, cheo: 0 },
    ];
    expect(pickBangKiemOptionIdsWithSessionData(opts, summary)).toEqual(["BK_A"]);
  });
});
