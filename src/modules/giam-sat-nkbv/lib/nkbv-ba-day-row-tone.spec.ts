import { describe, expect, it } from "vitest";
import { baCellToneClass, resolveBaDayTone } from "./nkbv-ba-day-row-tone";

describe("baCellToneClass (palette ngang cũ)", () => {
  it("mã màu khớp cellTone cũ", () => {
    expect(baCellToneClass("iwp")).toContain("bg-rose-100");
    expect(baCellToneClass("rit")).toContain("bg-emerald-100");
    expect(baCellToneClass("sbap")).toContain("bg-sky-100");
    expect(baCellToneClass("doe")).toContain("bg-red-300");
    expect(baCellToneClass("index")).toContain("bg-amber-200");
  });
});

describe("resolveBaDayTone", () => {
  it("ưu tiên DOE > Index > IWP > SBAP > RIT", () => {
    expect(
      resolveBaDayTone({
        date: "2026-07-20",
        indexDate: "2026-07-18",
        nsk: "2026-07-20",
        iwpDates: ["2026-07-20"],
        ritDates: ["2026-07-20"],
        sbapDates: ["2026-07-20"],
      }),
    ).toBe("doe");

    expect(
      resolveBaDayTone({
        date: "2026-07-18",
        indexDate: "2026-07-18",
        iwpDates: ["2026-07-18"],
      }),
    ).toBe("index");
  });
});
