import { describe, expect, it } from "vitest";
import { fmtDelta, fmtKyTruocDelta } from "./bao-cao-tong-hop-print-format";

describe("bao-cao-tong-hop-print-format — chênh lệch ghi bằng điểm %", () => {
  it("Δ tuần: có dấu và đơn vị «điểm %», không còn « % » tương đối gây hiểu nhầm", () => {
    expect(fmtDelta(-21.88, 2)).toBe("-21.88 điểm % so với tuần trước");
    expect(fmtDelta(3.4, 1)).toBe("+3.4 điểm % so với tuần trước");
    expect(fmtDelta(null)).toBe("— so với tuần trước");
  });

  it("Δ kỳ trước cùng đơn vị", () => {
    expect(fmtKyTruocDelta(5.48, "2026-05-20", "2026-07-31", 2)).toBe("vs kỳ trước (20-05→31-07): +5.48 điểm %");
  });
});
