import { describe, expect, it } from "vitest";
import { buildDecisionQueue } from "./decision-queue";

describe("buildDecisionQueue", () => {
  it("ranks red before yellow and caps at 10", () => {
    const items = buildDecisionQueue({
      tuNgay: "2026-07-01",
      denNgay: "2026-07-28",
      selectedKhoaIds: [],
      vstGaps: [
        {
          id: "k1",
          ten: "Khoa A",
          do_lech: 20,
          ty_le_ksnk: 60,
          tgs_co_hoi: 10,
          ksnk_co_hoi: 10,
        },
        {
          id: "k2",
          ten: "Khoa B",
          do_lech: 6,
          ty_le_ksnk: 88,
          tgs_co_hoi: 5,
          ksnk_co_hoi: 5,
        },
      ],
      gscGaps: [],
      checklistOverview: [
        { ma_bk: "BK01", ten_bang_kiem: "Vệ sinh tay", ty_le_tuan_thu: 65, tong_vi_pham: 12 },
      ],
      cssdRedAlert: 2,
      cssdFrozen: 1,
      nkbvChoXn: 3,
      qlcvOverdueCount: 4,
    });
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(10);
    expect(items[0]?.severity).toBe("red");
    expect(items.some((i) => i.domain === "CSSD")).toBe(true);
    expect(items.some((i) => i.domain === "NKBV")).toBe(true);
    expect(items.some((i) => i.createTaskHref?.includes("chi_so="))).toBe(true);
  });

  it("skips non-comparable gaps", () => {
    const items = buildDecisionQueue({
      tuNgay: "2026-07-01",
      denNgay: "2026-07-28",
      selectedKhoaIds: [],
      vstGaps: [{ ten: "Khoa C", do_lech: 50, tgs_co_hoi: 0, ksnk_co_hoi: 10 }],
      cssdRedAlert: 0,
      cssdFrozen: 0,
      nkbvChoXn: 0,
      qlcvOverdueCount: 0,
    });
    expect(items.every((i) => !i.id.startsWith("gap-"))).toBe(true);
  });
});
