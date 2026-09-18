import { describe, expect, it } from "vitest";
import { SIDEBAR_NAV_GROUPS } from "./sidebar-nav-groups";
import { SIDEBAR_ADMIN_GROUPS } from "./sidebar-admin-nav-groups";

describe("IA menu copy lock — Vận hành / Tra cứu / Sửa danh mục", () => {
  it("CSSD ops: Vận hành + Tra cứu; không nhân đôi ModeNav", () => {
    const labels = SIDEBAR_NAV_GROUPS.map((g) => g.label);
    expect(labels).toContain("CSSD · Vận hành");
    expect(labels).toContain("CSSD · Tra cứu");
    const vanHanh = SIDEBAR_NAV_GROUPS.find((g) => g.id === "cssd-ops");
    const traCuu = SIDEBAR_NAV_GROUPS.find((g) => g.id === "cssd-catalog");
    expect(vanHanh?.items.map((i) => i.href)).toEqual(["/cssd-quy-trinh", "/cssd-su-co"]);
    expect(traCuu?.items.map((i) => i.href)).toEqual(["/cssd-dung-cu", "/cssd-thiet-bi", "/cssd-hoa-chat"]);
  });

  it("admin: một cổng Sửa danh mục → /quan-tri-he-thong", () => {
    expect(SIDEBAR_ADMIN_GROUPS).toHaveLength(1);
    expect(SIDEBAR_ADMIN_GROUPS[0]?.label).toBe("Sửa danh mục");
    expect(SIDEBAR_ADMIN_GROUPS[0]?.items).toHaveLength(1);
    expect(SIDEBAR_ADMIN_GROUPS[0]?.items[0]?.href).toBe("/quan-tri-he-thong");
    expect(SIDEBAR_ADMIN_GROUPS[0]?.items[0]?.name).toBe("Quản trị hệ thống");
  });
});
