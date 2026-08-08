import { describe, expect, it } from "vitest";
import { deltaVsPriorPeriod, previousEqualLengthPeriod } from "./bao-cao-period-compare";

describe("bao-cao-period-compare", () => {
  it("kỳ 7 ngày → kỳ trước 7 ngày liền kề", () => {
    const p = previousEqualLengthPeriod("2026-07-22", "2026-07-28");
    expect(p).toEqual({ tu_ngay: "2026-07-15", den_ngay: "2026-07-21" });
  });

  it("tháng lịch → cùng số ngày trước đó", () => {
    const p = previousEqualLengthPeriod("2026-07-01", "2026-07-31");
    expect(p).toEqual({ tu_ngay: "2026-05-31", den_ngay: "2026-06-30" });
  });

  it("deltaVsPriorPeriod làm tròn 1 chữ số", () => {
    expect(deltaVsPriorPeriod(85.5, 80)).toBe(5.5);
    expect(deltaVsPriorPeriod(null, 80)).toBeNull();
  });
});
