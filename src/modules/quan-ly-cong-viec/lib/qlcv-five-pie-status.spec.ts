import { describe, it, expect } from "vitest";
import { countCongViecFivePieSlices, QLCV_FIVE_PIE_META, type QlcvFivePieKey } from "./qlcv-five-pie-status";

describe("countCongViecFivePieSlices", () => {
  it("DANG_LAM và TU_CHOI → nhóm pie `dang_lam`", () => {
    const c = countCongViecFivePieSlices([
      { trang_thai: "DANG_LAM" },
      { trang_thai: "TU_CHOI" },
    ]);
    expect(c.dang_lam).toBe(2);
    expect(c.cho_xu_ly).toBe(0);
  });

  it("HOAN_THANH / DA_HUY / QUA_HAN → đúng lát", () => {
    const c = countCongViecFivePieSlices([
      { trang_thai: "HOAN_THANH" },
      { trang_thai: "DA_HUY" },
      { trang_thai: "QUA_HAN" },
    ]);
    expect(c.hoan_thanh).toBe(1);
    expect(c.huy).toBe(1);
    expect(c.qua_han).toBe(1);
  });

  it("QLCV_FIVE_PIE_META có đúng 5 khóa duy nhất", () => {
    const keys = QLCV_FIVE_PIE_META.map((m) => m.key);
    const set = new Set<QlcvFivePieKey>(keys);
    expect(set.size).toBe(5);
    expect(set.has("dang_lam")).toBe(true);
  });
});
