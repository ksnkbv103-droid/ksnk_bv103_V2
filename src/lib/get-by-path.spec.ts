import { describe, expect, it } from "vitest";
import { getByPath } from "./get-by-path";

describe("getByPath", () => {
  it("reads top-level keys", () => {
    expect(getByPath({ ma_phieu: "P1" }, "ma_phieu")).toBe("P1");
  });

  it("reads nested dotted paths", () => {
    const row = { cssd_dm_bo_dung_cu: { ten_bo: "Bộ A", khoa: { ma_khoa: "K01" } } };
    expect(getByPath(row, "cssd_dm_bo_dung_cu.ten_bo")).toBe("Bộ A");
    expect(getByPath(row, "cssd_dm_bo_dung_cu.khoa.ma_khoa")).toBe("K01");
  });

  it("returns undefined for missing segments", () => {
    expect(getByPath({ a: {} }, "a.b.c")).toBeUndefined();
    expect(getByPath(null, "a.b")).toBeUndefined();
  });
});
