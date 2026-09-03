import { describe, expect, it } from "vitest";
import { isVstMissedAction, vstMaxIndications } from "./vst-constants";

describe("vstMaxIndications", () => {
  it("bỏ sót → 1 chỉ định", () => {
    expect(isVstMissedAction("Bỏ sót")).toBe(true);
    expect(vstMaxIndications("Bỏ sót")).toBe(1);
  });

  it("tuân thủ → 2 chỉ định", () => {
    expect(isVstMissedAction("Chà tay bằng cồn")).toBe(false);
    expect(vstMaxIndications("Chà tay bằng cồn")).toBe(2);
    expect(vstMaxIndications("Rửa tay bằng nước")).toBe(2);
  });
});
