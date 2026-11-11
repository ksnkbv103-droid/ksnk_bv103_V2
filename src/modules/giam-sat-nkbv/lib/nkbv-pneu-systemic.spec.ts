import { describe, expect, it } from "vitest";
import { derivePneuSystemic } from "./nkbv-pneu-systemic";

describe("derivePneuSystemic — P6.29", () => {
  it("người lớn: hạ thân nhiệt đơn độc KHÔNG tính", () => {
    expect(derivePneuSystemic({ has_pneu_hypothermia: true }, 50)).toBe(false);
  });
  it("trẻ ≤1 tuổi: hạ thân nhiệt tính", () => {
    expect(derivePneuSystemic({ has_pneu_hypothermia: true }, 1)).toBe(true);
  });
  it("người lớn: sốt/WBC vẫn tính", () => {
    expect(derivePneuSystemic({ has_pneu_fever: true }, 50)).toBe(true);
    expect(derivePneuSystemic({ has_pneu_wbc_abnormal: true }, 50)).toBe(true);
  });
  it("người lớn: cờ gộp cũ do hạ thân nhiệt sinh ra không tính", () => {
    expect(
      derivePneuSystemic({ has_pneu_hypothermia: true, fever_or_wbc_abnormal: true }, 50),
    ).toBe(false);
  });
});
