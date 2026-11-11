import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@/lib/auth/trusted-admin-email", () => ({
  isTrustedAdminEmail: vi.fn((email: string | null | undefined) => email === "admin@bv103.local"),
}));

import {
  canAccessDanhMucModuleRoute,
  canAccessPhanQuyenRoute,
  canAccessQuanTriHub,
  canAccessTaiKhoanNhanSuRoute,
} from "@/lib/auth/quan-tri-access";

function mockPermissions(roles: string[], permissions: { module: string; action: string }[]) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u1", email: "user@test.local" } },
  });
  mockFrom.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: { roles, permissions },
          error: null,
        })),
      })),
    })),
  });
}

describe("quan-tri-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AR-8h: khóa DANH_MUC cũ (nếu còn sót) không mở hub", async () => {
    mockPermissions([], [{ module: "DANH_MUC", action: "view" }]);
    await expect(canAccessQuanTriHub()).resolves.toBe(false);
  });

  it("denies phan-quyen route without PHAN_QUYEN view", async () => {
    mockPermissions([], [{ module: "GIAM_SAT_CHUNG", action: "view" }]);
    await expect(canAccessPhanQuyenRoute()).resolves.toBe(false);
  });

  it("PHAN_QUYEN.view mở hub Quản trị", async () => {
    mockPermissions([], [{ module: "PHAN_QUYEN", action: "view" }]);
    await expect(canAccessQuanTriHub()).resolves.toBe(true);
  });

  it("allows tai-khoan route for PHAN_QUYEN edit", async () => {
    mockPermissions(
      [],
      [
        { module: "PHAN_QUYEN", action: "view" },
        { module: "PHAN_QUYEN", action: "edit" },
      ],
    );
    await expect(canAccessTaiKhoanNhanSuRoute()).resolves.toBe(true);
  });

  it("DANH_MUC.view không mở trang khoa", async () => {
    mockPermissions([], [{ module: "DANH_MUC", action: "view" }]);
    await expect(canAccessDanhMucModuleRoute("KHOA_PHONG")).resolves.toBe(false);
  });

  it("KHOA_PHONG.view mở trang khoa nhưng không mở hub Quản trị (AR-8g)", async () => {
    mockPermissions([], [{ module: "KHOA_PHONG", action: "view" }]);
    await expect(canAccessQuanTriHub()).resolves.toBe(false);
    await expect(canAccessDanhMucModuleRoute("KHOA_PHONG")).resolves.toBe(true);
  });

  it("AR-8h: DANH_MUC.view không còn mở lookup DANH_MUC_ORG", async () => {
    mockPermissions([], [{ module: "DANH_MUC", action: "view" }]);
    await expect(canAccessDanhMucModuleRoute("DANH_MUC_ORG")).resolves.toBe(false);
  });

  it("AR-8h: GIAM_SAT_CHUNG.view mở danh mục GSC; CSSD_WORKFLOW.view mở danh mục CSSD", async () => {
    mockPermissions([], [{ module: "GIAM_SAT_CHUNG", action: "view" }]);
    await expect(canAccessDanhMucModuleRoute("GIAM_SAT_CHUNG")).resolves.toBe(true);
    await expect(canAccessDanhMucModuleRoute("CSSD_WORKFLOW")).resolves.toBe(false);
  });

  it("trusted admin bypasses checks", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "a1", email: "admin@bv103.local" } },
    });
    await expect(canAccessPhanQuyenRoute()).resolves.toBe(true);
    await expect(canAccessTaiKhoanNhanSuRoute()).resolves.toBe(true);
  });
});
