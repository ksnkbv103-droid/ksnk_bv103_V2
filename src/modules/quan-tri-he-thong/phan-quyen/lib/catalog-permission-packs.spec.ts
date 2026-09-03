import { describe, expect, it } from "vitest";
import {
  ALL_CATALOG_MODULES,
  applyCatalogPackToSet,
  CATALOG_PERMISSION_PACKS,
  catalogPermissionIds,
} from "./catalog-permission-packs";

const perms = [
  { id: "k-v", module_name: "KHOA_PHONG", action: "view" },
  { id: "k-e", module_name: "KHOA_PHONG", action: "edit" },
  { id: "l-v", module_name: "LOAI_DC", action: "view" },
  { id: "l-e", module_name: "LOAI_DC", action: "edit" },
  { id: "vst-e", module_name: "GIAM_SAT_VST", action: "edit" },
];

describe("catalog-permission-packs", () => {
  it("gom đủ 13 ô danh mục (kể cả hub DANH_MUC)", () => {
    expect(ALL_CATALOG_MODULES).toContain("DANH_MUC");
    expect(ALL_CATALOG_MODULES).toContain("KHOA_PHONG");
    expect(ALL_CATALOG_MODULES).toContain("LOAI_DC");
    expect(ALL_CATALOG_MODULES).toContain("BANG_KIEM");
    expect(ALL_CATALOG_MODULES.length).toBe(13);
  });

  it("gói tổ chức đầy đủ không đụng giám sát", () => {
    const next = applyCatalogPackToSet(
      new Set(["vst-e"]),
      perms,
      CATALOG_PERMISSION_PACKS.TO_CHUC.modules,
      "full",
    );
    expect(next.has("k-v")).toBe(true);
    expect(next.has("k-e")).toBe(true);
    expect(next.has("vst-e")).toBe(true);
    expect(next.has("l-e")).toBe(false);
  });

  it("chỉ xem gỡ sửa; tắt gói gỡ hết ô danh mục của gói", () => {
    const started = new Set(["k-v", "k-e", "vst-e"]);
    const viewOnly = applyCatalogPackToSet(started, perms, ["KHOA_PHONG"], "view");
    expect(viewOnly.has("k-v")).toBe(true);
    expect(viewOnly.has("k-e")).toBe(false);
    expect(viewOnly.has("vst-e")).toBe(true);
    const off = applyCatalogPackToSet(started, perms, ["KHOA_PHONG"], "off");
    expect(off.has("k-v")).toBe(false);
    expect(off.has("vst-e")).toBe(true);
    expect(catalogPermissionIds(perms, ["LOAI_DC"], ["view"])).toEqual(["l-v"]);
  });
});
