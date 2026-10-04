import { describe, expect, it } from "vitest";
import {
  computeHanSuDungFromMoc,
  resolvePackagingShelfDays,
} from "./cssd-packaging-shelf-life";

describe("resolvePackagingShelfDays", () => {
  it("returns configured days when positive", () => {
    expect(resolvePackagingShelfDays(7)).toBe(7);
    expect(resolvePackagingShelfDays(180)).toBe(180);
  });

  it("never defaults to 30 when missing", () => {
    expect(resolvePackagingShelfDays(null)).toBeNull();
    expect(resolvePackagingShelfDays(undefined)).toBeNull();
    expect(resolvePackagingShelfDays(0)).toBeNull();
    expect(resolvePackagingShelfDays(-1)).toBeNull();
    expect(resolvePackagingShelfDays(Number.NaN)).toBeNull();
  });
});

describe("computeHanSuDungFromMoc", () => {
  it("adds shelf days to batch end mốc", () => {
    expect(computeHanSuDungFromMoc("2026-10-05T10:00:00.000Z", 7)).toBe(
      "2026-10-12T10:00:00.000Z",
    );
  });

  it("returns null without mốc or shelf config", () => {
    expect(computeHanSuDungFromMoc(null, 30)).toBeNull();
    expect(computeHanSuDungFromMoc("2026-10-05T10:00:00.000Z", null)).toBeNull();
    expect(computeHanSuDungFromMoc("bad-date", 7)).toBeNull();
  });
});
