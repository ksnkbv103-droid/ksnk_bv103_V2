import { describe, expect, it } from "vitest";
import {
  normalizeQlcvStaffIdList,
  formatQlcvPhoiHopChips,
  qlcvAssigneeInitials,
} from "./qlcv-staff-ids";

describe("normalizeQlcvStaffIdList", () => {
  it("dedupes and trims", () => {
    expect(normalizeQlcvStaffIdList([" a ", "b", "a", "", null])).toEqual(["a", "b"]);
  });
  it("empty for non-array", () => {
    expect(normalizeQlcvStaffIdList(null)).toEqual([]);
  });
});

describe("formatQlcvPhoiHopChips", () => {
  it("returns empty when no phối hợp", () => {
    expect(formatQlcvPhoiHopChips([], []).empty).toBe(true);
  });
  it("maps labels and counts extra", () => {
    const opts = [
      { id: "a", label: "Nguyễn Văn A" },
      { id: "b", label: "Trần B" },
      { id: "c", label: "Lê C" },
      { id: "d", label: "Phạm D" },
    ];
    const out = formatQlcvPhoiHopChips(["a", "b", "c", "d"], opts, 2);
    expect(out.empty).toBe(false);
    expect(out.chips).toHaveLength(2);
    expect(out.extra).toBe(2);
    expect(out.title).toContain("Phối hợp");
  });
});

describe("qlcvAssigneeInitials", () => {
  it("builds initials", () => {
    expect(qlcvAssigneeInitials("Nguyễn Văn An")).toBe("NA");
    expect(qlcvAssigneeInitials("")).toBe("?");
  });
});
