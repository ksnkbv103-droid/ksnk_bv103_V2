import { describe, expect, it } from "vitest";
import {
  pathnameNeedsCssdOfflineSync,
  pathnameNeedsSupervisionOfflineSync,
} from "./offline-sync-scope";

describe("pathnameNeedsSupervisionOfflineSync", () => {
  it("attaches on giám sát / QR routes", () => {
    expect(pathnameNeedsSupervisionOfflineSync("/giam-sat")).toBe(true);
    expect(pathnameNeedsSupervisionOfflineSync("/giam-sat-vst")).toBe(true);
    expect(pathnameNeedsSupervisionOfflineSync("/giam-sat-chung/form")).toBe(true);
    expect(pathnameNeedsSupervisionOfflineSync("/giam-sat-nkbv?case=1")).toBe(true);
    expect(pathnameNeedsSupervisionOfflineSync("/qr")).toBe(true);
  });

  it("skips admin / login / dashboard", () => {
    expect(pathnameNeedsSupervisionOfflineSync("/login")).toBe(false);
    expect(pathnameNeedsSupervisionOfflineSync("/")).toBe(false);
    expect(pathnameNeedsSupervisionOfflineSync("/quan-tri-he-thong")).toBe(false);
    expect(pathnameNeedsSupervisionOfflineSync("/quan-ly-cong-viec")).toBe(false);
  });
});

describe("pathnameNeedsCssdOfflineSync", () => {
  it("attaches on CSSD shell prefixes", () => {
    expect(pathnameNeedsCssdOfflineSync("/cssd-quy-trinh")).toBe(true);
    expect(pathnameNeedsCssdOfflineSync("/cssd-su-co")).toBe(true);
    expect(pathnameNeedsCssdOfflineSync("/cssd-dung-cu/x")).toBe(true);
    expect(pathnameNeedsCssdOfflineSync("/cssd-erp/batch")).toBe(true);
  });

  it("skips non-CSSD", () => {
    expect(pathnameNeedsCssdOfflineSync("/login")).toBe(false);
    expect(pathnameNeedsCssdOfflineSync("/quan-tri-he-thong/phan-quyen")).toBe(false);
    expect(pathnameNeedsCssdOfflineSync("/giam-sat-vst")).toBe(false);
  });
});
