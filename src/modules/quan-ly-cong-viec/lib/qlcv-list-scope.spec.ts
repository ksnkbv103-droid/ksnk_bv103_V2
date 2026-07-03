import { describe, expect, it } from "vitest";
import {
  applyQlcvListScopeToQuery,
  mergeQlcvScopeWithSearchOr,
  qlcvRowMatchesListScope,
} from "./qlcv-list-scope";

const KSNK_ID = "ksnk-uuid-001";

describe("qlcv-list-scope KSNK-only", () => {
  const scope = { bypassAll: false, ksnkKhoaId: KSNK_ID, actorStaffId: "a1" };

  it("does not filter by khoa column — module boundary at access gate", () => {
    const calls: string[] = [];
    const mockQuery = {
      or: (f: string) => {
        calls.push(`or:${f}`);
        return mockQuery;
      },
    };
    const result = applyQlcvListScopeToQuery(mockQuery, scope);
    expect(result).toBe(mockQuery);
    expect(calls).toEqual([]);
  });

  it("passes through search filter only", () => {
    const merged = mergeQlcvScopeWithSearchOr(scope, "tieu_de.ilike.%abc%");
    expect(merged).toBe("tieu_de.ilike.%abc%");
  });

  it("row match is always true within module", () => {
    expect(qlcvRowMatchesListScope({}, scope)).toBe(true);
    expect(qlcvRowMatchesListScope({ nguoi_phu_trach_id: "x" }, scope)).toBe(true);
  });
});
