import { describe, expect, it } from "vitest";
import { enrichVstSessionRows } from "./vst-read-utils";

describe("enrichVstSessionRows compliance (VST 1 decimal)", () => {
  it("uses roundPercent1: 2/3 → 66.7 not Math.round 67", () => {
    const rows = enrichVstSessionRows([
      {
        id: "s1",
        tong_co_hoi: 3,
        da_tuan_thu: 2,
        ngay_giam_sat: "2026-09-01",
        observations: [],
      },
    ]);
    expect(rows[0]?.compliance).toBe(66.7);
  });

  it("zero opportunities → 0", () => {
    const rows = enrichVstSessionRows([
      { id: "s2", tong_co_hoi: 0, da_tuan_thu: 0, observations: [] },
    ]);
    expect(rows[0]?.compliance).toBe(0);
  });
});
