import { describe, expect, it } from "vitest";
import {
  genericDmMustUseDedicatedPageError,
  getDanhMucAdminPath,
  getDanhMucOwnerKey,
  getDedicatedDanhMucAdminPath,
  getOwnedDanhMucHref,
} from "./danh-muc-admin-routes";
import { REGISTRY_LOAI_TRUNG_TAM_ONLY } from "./domain-registry";
import { quanTriDungCuHref } from "./quan-tri-paths";

describe("danh-muc-admin-routes — DM-3", () => {
  it("LOAI_DUNG_CU và KHOA_PHONG có trang chuyên dụng", () => {
    expect(getDedicatedDanhMucAdminPath("LOAI_DUNG_CU")).toBe(quanTriDungCuHref("loai"));
    expect(getDedicatedDanhMucAdminPath("KHOA_PHONG")).toBe("/to-chuc/khoa-phong");
    expect(getDedicatedDanhMucAdminPath("TRAM_CSSD")).toBeNull();
  });

  it("mọi loại trung tâm-only đều có dedicated path (không còn form generic)", () => {
    for (const k of REGISTRY_LOAI_TRUNG_TAM_ONLY) {
      expect(getDedicatedDanhMucAdminPath(k)).toBeTruthy();
      expect(getDanhMucAdminPath(k)).toBe(getDedicatedDanhMucAdminPath(k));
    }
  });

  it("AR-8e: danh mục tổ chức (DANH_MUC_ORG) mở trong module Tổ chức", () => {
    expect(getDanhMucAdminPath("CHUC_VU")).toBe("/to-chuc/danh-muc/CHUC_VU");
    expect(getDanhMucAdminPath("KHOI_KHOA")).toBe("/to-chuc/danh-muc/KHOI_KHOA");
  });

  it("AR-8f: danh mục GSTT/CSSD mở trong module sở hữu; NKBV/vai trò còn ở chuyen-biet", () => {
    expect(getDanhMucAdminPath("TRAM_CSSD")).toBe("/cssd-quy-trinh/danh-muc/TRAM_CSSD");
    expect(getDanhMucAdminPath("LOAI_SU_CO")).toBe("/cssd-quy-trinh/danh-muc/LOAI_SU_CO");
    expect(getDanhMucAdminPath("KHU_VUC_GIAM_SAT")).toBe("/giam-sat-chung/danh-muc/KHU_VUC_GIAM_SAT");
    expect(getDanhMucAdminPath("LOAI_NKBV")).toBe("/quan-tri-he-thong/danh-muc/chuyen-biet/LOAI_NKBV");
    expect(getOwnedDanhMucHref("TRAM_CSSD", "DANH_MUC_GSTT")).toBeNull();
    expect(getOwnedDanhMucHref("CHUC_VU", "DANH_MUC_CSSD_LOOKUP")).toBeNull();
    expect(getDanhMucOwnerKey("HINH_THUC_GIAM_SAT")).toBe("DANH_MUC_GSTT");
  });

  it("action generic từ chối rõ ràng khi loại có trang riêng", () => {
    expect(genericDmMustUseDedicatedPageError("LOAI_DUNG_CU")).toMatch(/trang chuyên dụng/);
    expect(genericDmMustUseDedicatedPageError("LOAI_DUNG_CU")).toContain(quanTriDungCuHref("loai"));
    expect(genericDmMustUseDedicatedPageError("KHOA_PHONG")).toMatch(/trang chuyên dụng/);
    expect(genericDmMustUseDedicatedPageError("TRAM_CSSD")).toBeNull();
  });
});
