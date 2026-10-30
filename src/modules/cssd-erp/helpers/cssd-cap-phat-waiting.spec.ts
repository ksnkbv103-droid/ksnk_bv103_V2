import { describe, expect, it } from "vitest";
import { filterOutExpiredPacks, filterOutRecallPending } from "./cssd-cap-phat-waiting";

describe("filterOutRecallPending", () => {
  it("bỏ bộ CHO_THU_VE, giữ bộ còn lại", () => {
    const rows = [{ id: "a" }, { id: 2 }, { id: "c" }];
    expect(filterOutRecallPending(rows, new Set(["2"]))).toEqual([{ id: "a" }, { id: "c" }]);
  });
});

describe("filterOutExpiredPacks", () => {
  it("bỏ bộ quá HSD; giữ bộ còn hạn, đúng ngày hôm nay, và thiếu HSD", () => {
    const rows = [
      { id: "cu", han_su_dung: "2026-10-01" },
      { id: "nay", han_su_dung: "2026-10-30" },
      { id: "moi", ngay_het_han: "2026-11-15" },
      { id: "thieu" },
    ];
    expect(filterOutExpiredPacks(rows, "2026-10-30").map((r) => r.id)).toEqual(["nay", "moi", "thieu"]);
  });
});
