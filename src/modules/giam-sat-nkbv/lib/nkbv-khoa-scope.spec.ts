import { describe, expect, it } from "vitest";
import { nkbvKhoaVisible, resolveNkbvKhoaRestriction } from "./nkbv-khoa-scope";

const base = { isAdmin: false, isNhanVienKsnk: false, isMangLuoiKsnk: false, actorKhoaId: null, roles: [] as string[] };

describe("resolveNkbvKhoaRestriction", () => {
  it("admin, NV KSNK, Hội đồng xem toàn viện", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, isAdmin: true })).toEqual({ kind: "all" });
    expect(resolveNkbvKhoaRestriction({ ...base, isNhanVienKsnk: true, isMangLuoiKsnk: true })).toEqual({ kind: "all" });
    expect(resolveNkbvKhoaRestriction({ ...base, roles: ["HOI_DONG_KSNK"] })).toEqual({ kind: "all" });
  });
  it("Mạng lưới thuần bị khóa vào khoa mình", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, isMangLuoiKsnk: true, actorKhoaId: " k1 " })).toEqual({ kind: "khoa", khoaId: "k1" });
  });
  it("Mạng lưới chưa gán khoa thì không thấy gì", () => {
    expect(resolveNkbvKhoaRestriction({ ...base, isMangLuoiKsnk: true })).toEqual({ kind: "none" });
  });
});

describe("nkbvKhoaVisible", () => {
  it("khớp khoa điều trị hoặc khoa trên lưới ngày", () => {
    const r = { kind: "khoa", khoaId: "k1" } as const;
    expect(nkbvKhoaVisible(r, ["k2", null, "k1"])).toBe(true);
    expect(nkbvKhoaVisible(r, ["k2", undefined])).toBe(false);
    expect(nkbvKhoaVisible({ kind: "none" }, ["k1"])).toBe(false);
    expect(nkbvKhoaVisible({ kind: "all" }, [])).toBe(true);
  });
});
