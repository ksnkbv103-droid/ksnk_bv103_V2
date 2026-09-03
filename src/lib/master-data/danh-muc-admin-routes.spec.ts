import { describe, expect, it } from "vitest";
import {
  genericDmMustUseDedicatedPageError,
  getDanhMucAdminPath,
  getDedicatedDanhMucAdminPath,
} from "./danh-muc-admin-routes";
import { REGISTRY_LOAI_TRUNG_TAM_ONLY } from "./domain-registry";
import { quanTriDungCuHref } from "./quan-tri-paths";

describe("danh-muc-admin-routes — DM-3", () => {
  it("LOAI_DUNG_CU và KHOA_PHONG có trang chuyên dụng", () => {
    expect(getDedicatedDanhMucAdminPath("LOAI_DUNG_CU")).toBe(quanTriDungCuHref("loai"));
    expect(getDedicatedDanhMucAdminPath("KHOA_PHONG")).toBe("/quan-tri-he-thong/danh-muc/khoa-phong");
    expect(getDedicatedDanhMucAdminPath("TRAM_CSSD")).toBeNull();
  });

  it("mọi loại trung tâm-only đều có dedicated path (không còn form generic)", () => {
    for (const k of REGISTRY_LOAI_TRUNG_TAM_ONLY) {
      expect(getDedicatedDanhMucAdminPath(k)).toBeTruthy();
      expect(getDanhMucAdminPath(k)).toBe(getDedicatedDanhMucAdminPath(k));
    }
  });

  it("action generic từ chối rõ ràng khi loại có trang riêng", () => {
    expect(genericDmMustUseDedicatedPageError("LOAI_DUNG_CU")).toMatch(/trang chuyên dụng/);
    expect(genericDmMustUseDedicatedPageError("LOAI_DUNG_CU")).toContain(quanTriDungCuHref("loai"));
    expect(genericDmMustUseDedicatedPageError("KHOA_PHONG")).toMatch(/trang chuyên dụng/);
    expect(genericDmMustUseDedicatedPageError("TRAM_CSSD")).toBeNull();
  });
});
