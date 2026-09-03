import { describe, expect, it } from "vitest";
import {
  isBv103PickerPortalTarget,
  resolveBv103PickerPortalRoot,
  unlockBv103PickerPortalKeyboard,
} from "./bv103-picker-portal";

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

describe("resolveBv103PickerPortalRoot", () => {
  it("không chạy ngoài trình duyệt", () => {
    expect(() => resolveBv103PickerPortalRoot()).toThrow(/trình duyệt/);
  });
});

describe("unlockBv103PickerPortalKeyboard", () => {
  it("gỡ aria-hidden / inert để gõ được ô tìm", () => {
    const attrs: Record<string, string> = { "aria-hidden": "true", inert: "" };
    const el = {
      getAttribute: (k: string) => (k in attrs ? attrs[k] : null),
      hasAttribute: (k: string) => k in attrs,
      removeAttribute: (k: string) => {
        delete attrs[k];
      },
    } as unknown as HTMLElement;
    const stop = unlockBv103PickerPortalKeyboard(el);
    expect(el.getAttribute("aria-hidden")).toBeNull();
    expect(el.hasAttribute("inert")).toBe(false);
    stop();
  });
});
