import { describe, expect, it } from "vitest";
import { applyQlcvListScope, mergeQlcvScopeWithSearchOr, qlcvRowMatchesListScope } from "./qlcv-list-scope";

describe("qlcv-list-scope", () => {
  const calls: string[] = [];
  const mockQuery = {
    or: (f: string) => {
      calls.push(`or:${f}`);
      return mockQuery;
    },
    eq: (col: string, val: string) => {
      calls.push(`eq:${col}=${val}`);
      return mockQuery;
    },
  };

  it("bypass leaves query unchanged", () => {
    calls.length = 0;
    applyQlcvListScope(mockQuery, { bypassAll: true, khoaId: null, actorStaffId: null });
    expect(calls).toEqual([]);
  });

  it("scopes by khoa and actor", () => {
    calls.length = 0;
    applyQlcvListScope(mockQuery, {
      bypassAll: false,
      khoaId: "k1",
      actorStaffId: "a1",
    });
    expect(calls[0]).toContain("khoa_thuc_hien_id.eq.k1");
    expect(calls[0]).toContain("nguoi_phu_trach_id.eq.a1");
    expect(calls[0]).toContain("nguoi_tao_id.eq.a1");
  });

  it("merge scope and search into single or", () => {
    const merged = mergeQlcvScopeWithSearchOr(
      { bypassAll: false, khoaId: "k1", actorStaffId: "a1" },
      "tieu_de.ilike.%abc%",
    );
    expect(merged).toContain("and(khoa_thuc_hien_id.eq.k1,tieu_de.ilike.%abc%)");
  });

  it("row match: assignee, creator, khoa", () => {
    const scope = { bypassAll: false, khoaId: "k1", actorStaffId: "a1" };
    expect(qlcvRowMatchesListScope({ nguoi_phu_trach_id: "a1" }, scope)).toBe(true);
    expect(qlcvRowMatchesListScope({ nguoi_tao_id: "a1" }, scope)).toBe(true);
    expect(qlcvRowMatchesListScope({ khoa_thuc_hien_id: "k1" }, scope)).toBe(true);
    expect(qlcvRowMatchesListScope({ khoa_thuc_hien_id: "k2" }, scope)).toBe(false);
  });
});
