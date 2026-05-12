import { describe, expect, it } from "vitest";
import { normalizeHanIso, normalizeMaLo, sameLotKey } from "./kho-hoa-chat-lot";

describe("kho-hoa-chat-lot", () => {
  it("normalizes empty lot to null", () => {
    expect(normalizeMaLo("")).toBeNull();
    expect(normalizeMaLo("  ")).toBeNull();
    expect(normalizeMaLo("AB-1")).toBe("AB-1");
  });

  it("normalizes date to ISO day", () => {
    expect(normalizeHanIso("2026-12-31")).toBe("2026-12-31");
    expect(normalizeHanIso(null)).toBeNull();
  });

  it("sameLotKey matches null lot", () => {
    expect(sameLotKey({ ma_lo: null, han_su_dung: null }, { ma_lo: "", han_su_dung: null })).toBe(true);
  });
});
