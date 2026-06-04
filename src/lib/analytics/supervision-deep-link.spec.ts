import { describe, expect, it } from "vitest";
import { parseAnalyticsUrlSeed, parseSupervisionTab } from "./supervision-deep-link";

describe("supervision-deep-link", () => {
  it("parseSupervisionTab maps analytics and history", () => {
    expect(parseSupervisionTab("analytics")).toBe("analytics");
    expect(parseSupervisionTab("history")).toBe("history");
    expect(parseSupervisionTab(null)).toBe("form");
    expect(parseSupervisionTab("bogus")).toBe("form");
  });

  it("parseAnalyticsUrlSeed reads dates and khoa_ids", () => {
    const q = new URLSearchParams("tu_ngay=2026-01-01&den_ngay=2026-01-31&khoa_ids=a,b");
    expect(parseAnalyticsUrlSeed(q)).toEqual({
      tu_ngay: "2026-01-01",
      den_ngay: "2026-01-31",
      khoa_ids: ["a", "b"],
    });
  });

  it("parseAnalyticsUrlSeed rejects invalid dates", () => {
    const q = new URLSearchParams("tu_ngay=bad");
    expect(parseAnalyticsUrlSeed(q)).toBeNull();
  });
});
