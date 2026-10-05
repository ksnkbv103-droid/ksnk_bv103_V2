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
    mocks.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ sys_roles: { name: "NHAN_VIEN_KSNK" } }],
          error: null,
        })),
      })),
    });

    await expect(ensureRbacAdmin()).rejects.toThrow(/quản trị hệ thống/i);
  });

  it("allows ADMIN role", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "a1", email: "admin@example.test" } },
    });
    mocks.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ sys_roles: { name: "ADMIN" } }],
          error: null,
        })),
      })),
    });

    await expect(ensureRbacAdmin()).resolves.toMatchObject({ id: "a1" });
  });
});
