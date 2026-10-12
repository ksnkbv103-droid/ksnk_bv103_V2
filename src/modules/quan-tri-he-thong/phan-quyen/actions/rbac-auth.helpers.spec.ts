import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  isTrustedAdminEmail: vi.fn(),
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
  })),
  createAdminSupabaseClient: vi.fn(() => ({ from: mocks.from })),
}));

vi.mock("@/lib/auth/trusted-admin-email", () => ({
  isTrustedAdminEmail: mocks.isTrustedAdminEmail,
}));

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: mocks.logAdminAction,
}));

import { ensureRbacAdmin } from "./rbac-auth.helpers";

/** Mock admin client: sys_user_roles trả `roles`, mdm_nhan_su trả `profile`. */
function mockAdmin(roles: unknown[], profile: { id: string; is_active: boolean } | null) {
  mocks.from.mockImplementation((table: string) => {
    if (table === "mdm_nhan_su") {
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }),
      };
    }
    return { select: () => ({ eq: async () => ({ data: roles, error: null }) }) };
  });
}

describe("ensureRbacAdmin ADM-03", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedAdminEmail.mockReturnValue(false);
    mocks.logAdminAction.mockResolvedValue(undefined);
  });

  it("rejects PHAN_QUYEN.edit without ADMIN role", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "u1", email: "editor@example.test" } },
    });
    mockAdmin([{ sys_roles: { name: "NHAN_VIEN_KSNK", is_active: true } }], { id: "ns1", is_active: true });

    await expect(ensureRbacAdmin()).rejects.toThrow(/quản trị hệ thống/i);
  });

  it("allows ADMIN role", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "a1", email: "admin@example.test" } },
    });
    mockAdmin([{ sys_roles: { name: "ADMIN", is_active: true } }], { id: "ns1", is_active: true });

    await expect(ensureRbacAdmin()).resolves.toMatchObject({ id: "a1" });
  });

  it("ACC-2: ADMIN nhưng hồ sơ nhân sự đã ngưng → từ chối", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "a1", email: "admin@example.test" } } });
    mockAdmin([{ sys_roles: { name: "ADMIN", is_active: true } }], { id: "ns1", is_active: false });

    await expect(ensureRbacAdmin()).rejects.toThrow(/quản trị hệ thống/i);
  });

  it("ACC-2: ADMIN không có hồ sơ nhân sự → từ chối", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "a1", email: "admin@example.test" } } });
    mockAdmin([{ sys_roles: { name: "ADMIN", is_active: true } }], null);

    await expect(ensureRbacAdmin()).rejects.toThrow(/quản trị hệ thống/i);
  });

  it("ACC-2: vai trò ADMIN bị tắt → từ chối", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "a1", email: "admin@example.test" } } });
    mockAdmin([{ sys_roles: { name: "ADMIN", is_active: false } }], { id: "ns1", is_active: true });

    await expect(ensureRbacAdmin()).rejects.toThrow(/quản trị hệ thống/i);
  });

  it("break-glass vẫn qua (không phụ thuộc hồ sơ)", async () => {
    mocks.isTrustedAdminEmail.mockReturnValue(true);
    mocks.getUser.mockResolvedValue({ data: { user: { id: "bg", email: "bg@example.test" } } });

    await expect(ensureRbacAdmin()).resolves.toMatchObject({ id: "bg" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
