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

  it("allows hub when user has DANH_MUC view", async () => {
    mockPermissions([], [{ module: "DANH_MUC", action: "view" }]);
    await expect(canAccessQuanTriHub()).resolves.toBe(true);
  });

  it("denies phan-quyen route without PHAN_QUYEN view", async () => {
    mockPermissions([], [{ module: "DANH_MUC", action: "view" }]);
    await expect(canAccessPhanQuyenRoute()).resolves.toBe(false);
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

  it("allows danh mục module via DANH_MUC fallback", async () => {
    mockPermissions([], [{ module: "DANH_MUC", action: "view" }]);
    await expect(canAccessDanhMucModuleRoute("KHOA_PHONG")).resolves.toBe(true);
  });

  it("trusted admin bypasses checks", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "a1", email: "admin@bv103.local" } },
    });
    await expect(canAccessPhanQuyenRoute()).resolves.toBe(true);
    await expect(canAccessTaiKhoanNhanSuRoute()).resolves.toBe(true);
  });
});
