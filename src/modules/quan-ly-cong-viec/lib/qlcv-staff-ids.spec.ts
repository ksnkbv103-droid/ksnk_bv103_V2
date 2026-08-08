import { describe, expect, it } from "vitest";
import { normalizeQlcvStaffIdList } from "./qlcv-staff-ids";

describe("normalizeQlcvStaffIdList", () => {
  it("dedupes and trims", () => {
    expect(normalizeQlcvStaffIdList([" a ", "b", "a", "", null])).toEqual(["a", "b"]);
  });
  it("empty for non-array", () => {
    expect(normalizeQlcvStaffIdList(null)).toEqual([]);
  });
});
