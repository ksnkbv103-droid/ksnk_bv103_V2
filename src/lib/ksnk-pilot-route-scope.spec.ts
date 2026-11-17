import { afterEach, describe, expect, it } from "vitest";
import {
  isNavHiddenUnderActivePilot,
  isPathBlockedUnderActivePilot,
  isRouteInPilotScope,
  resolvePilotSafeEntryPath,
} from "./ksnk-pilot-route-scope";

const ENV_KEYS = ["KSNK_PILOT_CORE_MODULES", "KSNK_PILOT_FOUR_MODULES"] as const;

afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("ksnk-pilot-route-scope — default (no env)", () => {
  it("does not block routes when pilot flags absent", () => {
    expect(isPathBlockedUnderActivePilot("/bao-cao-tong-hop")).toBe(false);
    expect(isPathBlockedUnderActivePilot("/quan-ly-cong-viec")).toBe(false);
    expect(isPathBlockedUnderActivePilot("/cssd-erp/report")).toBe(false);
    expect(resolvePilotSafeEntryPath()).toBe("/bao-cao-tong-hop");
  });
});

describe("ksnk-pilot-route-scope — four modules", () => {
  it("ẩn NKBV/QLCV/Đào tạo (route 404 + menu), giữ VST/GSC/thống kê/Quản trị/CSSD", () => {
    process.env.KSNK_PILOT_FOUR_MODULES = "1";
    expect(isNavHiddenUnderActivePilot("cv")).toBe(true);
    expect(isNavHiddenUnderActivePilot("nkbv")).toBe(true);
    expect(isNavHiddenUnderActivePilot("cssd-qt")).toBe(false);
    expect(isRouteInPilotScope("/quan-ly-cong-viec")).toBe(false);
    expect(isRouteInPilotScope("/giam-sat-nkbv")).toBe(false);
    expect(isRouteInPilotScope("/giam-sat")).toBe(true);
    for (const gate of ["cv", "nkbv", "dao-tao"]) {
      expect(isNavHiddenUnderActivePilot(gate)).toBe(true);
    }
    for (const gate of ["vst", "gsc", "dash", "thong-ke", "qt", "cssd-qt", "cssd-su-co", "cssd-dung-cu"]) {
      expect(isNavHiddenUnderActivePilot(gate)).toBe(false);
    }
    for (const path of ["/quan-ly-cong-viec", "/giam-sat-nkbv", "/giam-sat-nkbv/danh-muc/LOAI_NKBV", "/dao-tao", "/dao-tao/thi"]) {
      expect(isRouteInPilotScope(path)).toBe(false);
    }
    for (const path of [
      "/giam-sat",
      "/giam-sat-vst",
      "/giam-sat-chung",
      "/thong-ke",
      "/bao-cao-tong-hop",
      "/quan-tri-he-thong",
      "/cssd-erp",
      "/cssd-erp/report",
      "/cssd-quy-trinh",
      "/cssd-dung-cu",
      "/cssd-thiet-bi",
      "/cssd-hoa-chat",
      "/cssd-su-co",
      "/phe-duyet",
    ]) {
      expect(isRouteInPilotScope(path)).toBe(true);
    }
    expect(isPathBlockedUnderActivePilot(resolvePilotSafeEntryPath())).toBe(false);
  });

  it("không nhầm tiền tố: /dao-tao-xyz không bị chặn", () => {
    process.env.KSNK_PILOT_FOUR_MODULES = "1";
    expect(isRouteInPilotScope("/dao-tao-xyz")).toBe(true);
  });

  it("bỏ biến → hiện đủ NKBV/QLCV/Đào tạo cả route lẫn menu", () => {
    process.env.KSNK_PILOT_FOUR_MODULES = "1";
    expect(isRouteInPilotScope("/dao-tao")).toBe(false);
    delete process.env.KSNK_PILOT_FOUR_MODULES;
    for (const path of ["/quan-ly-cong-viec", "/giam-sat-nkbv", "/dao-tao", "/cssd-erp"]) {
      expect(isRouteInPilotScope(path)).toBe(true);
    }
    for (const gate of ["cv", "nkbv", "dao-tao"]) {
      expect(isNavHiddenUnderActivePilot(gate)).toBe(false);
    }
  });
});

describe("ksnk-pilot-route-scope — core modules", () => {
  it("entry path is not blocked under core pilot", () => {
    process.env.KSNK_PILOT_CORE_MODULES = "1";
    expect(isPathBlockedUnderActivePilot("/bao-cao-tong-hop")).toBe(true);
    const home = resolvePilotSafeEntryPath();
    expect(home).toBe("/giam-sat");
    expect(isPathBlockedUnderActivePilot(home)).toBe(false);
  });
});

describe("ksnk-pilot-route-scope — AR-8e/8f route danh mục theo module", () => {
  it("Tổ chức và danh mục GSC mở dưới mọi cờ pilot; danh mục CSSD/NKBV theo module", () => {
    for (const flag of ENV_KEYS) {
      process.env[flag] = "1";
      expect(isPathBlockedUnderActivePilot("/to-chuc")).toBe(false);
      expect(isPathBlockedUnderActivePilot("/to-chuc/nhan-su")).toBe(false);
      expect(isPathBlockedUnderActivePilot("/giam-sat-chung/danh-muc/KHU_VUC_GIAM_SAT")).toBe(false);
      expect(isPathBlockedUnderActivePilot("/giam-sat-nkbv/danh-muc/LOAI_NKBV")).toBe(true);
      delete process.env[flag];
    }
    process.env.KSNK_PILOT_CORE_MODULES = "1";
    expect(isPathBlockedUnderActivePilot("/cssd-quy-trinh/danh-muc/TRAM_CSSD")).toBe(true);
  });
});
