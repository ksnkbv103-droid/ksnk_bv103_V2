import { describe, expect, it } from "vitest";
import {
  appendPreservedAnalyticsQueryKeys,
  parseAnalyticsUrlSeed,
  parseSupervisionTab,
  preservedAnalyticsQuerySnapshot,
} from "./supervision-deep-link";

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

  it("appendPreservedAnalyticsQueryKeys keeps bk drill-down when syncing filters", () => {
    const target = new URLSearchParams("tu_ngay=2026-01-01");
    const source = new URLSearchParams("bk=BM.11.01&view=bk-toi");
    appendPreservedAnalyticsQueryKeys(target, source);
    expect(target.get("bk")).toBe("BM.11.01");
    expect(target.get("view")).toBe("bk-toi");
    expect(target.get("tu_ngay")).toBe("2026-01-01");
  });

  it("preservedAnalyticsQuerySnapshot is stable string for effect deps", () => {
    const q = new URLSearchParams("bk=BM.11.01&view=bk-toi");
    expect(preservedAnalyticsQuerySnapshot(q)).toBe("bk=BM.11.01\u0001view=bk-toi\u0001loai=");
  });
});
