import { describe, expect, it } from "vitest";
import { isBv103PickerPortalTarget } from "./bv103-picker-portal";

describe("isBv103PickerPortalTarget", () => {
  it("true khi closest tìm thấy portal attr", () => {
    const target = {
      closest: (sel: string) => (sel.includes("data-bv103-picker-portal") ? {} : null),
    };
    expect(isBv103PickerPortalTarget(target as unknown as EventTarget)).toBe(true);
  });

  it("false khi không thuộc portal", () => {
    const target = { closest: () => null };
    expect(isBv103PickerPortalTarget(target as unknown as EventTarget)).toBe(false);
  });

  it("false với null", () => {
    expect(isBv103PickerPortalTarget(null)).toBe(false);
  });
});
