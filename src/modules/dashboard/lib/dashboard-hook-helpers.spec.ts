import { describe, expect, it } from "vitest";
import { effectiveFilterIds, sortedJoinIds } from "@/lib/analytics/filter-helpers";

describe("analytics filter helpers", () => {
  it("effectiveFilterIds returns null when all selected", () => {
    expect(effectiveFilterIds(["a", "b"], 2)).toBeNull();
  });

  it("sortedJoinIds is stable", () => {
    expect(sortedJoinIds(["b", "a"])).toBe(sortedJoinIds(["a", "b"]));
  });
});
