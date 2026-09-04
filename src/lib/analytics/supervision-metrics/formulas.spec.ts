import { describe, expect, it } from "vitest";
import { computeCcs } from "./formulas";

describe("computeCcs (D10 quarantine — pure internal)", () => {
  it("weighted average when both present", () => {
    const { value, note } = computeCcs(80, 90);
    expect(value).toBe(85);
    expect(note).toContain("50%");
  });

  it("single source fallback", () => {
    const { value, note } = computeCcs(75, null);
    expect(value).toBe(75);
    expect(note).toContain("VST");
  });
});
