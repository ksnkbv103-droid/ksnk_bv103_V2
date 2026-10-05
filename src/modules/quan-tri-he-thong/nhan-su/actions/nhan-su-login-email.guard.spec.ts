import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestAuthUser: vi.fn(),
  isTrustedAdminEmail: vi.fn(),
  verifyCurrentActorPassword: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/auth/rbac-request", () => ({
  getRequestAuthUser: mocks.getRequestAuthUser,
}));

vi.mock("@/lib/auth/trusted-admin-email", () => ({
  isTrustedAdminEmail: mocks.isTrustedAdminEmail,
}));

vi.mock("@/modules/quan-tri-he-thong/tai-khoan-nhan-su/lib/admin-reauth", () => ({
  verifyCurrentActorPassword: mocks.verifyCurrentActorPassword,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}));

import {
  assertLoginEmailChangeAllowed,
  ensureAdminForLoginEmailChange,
} from "./nhan-su-login-email.guard";

function mockRoleQuery(roleName: string | null) {
  mocks.from.mockReturnValue({
    select: vi.fn(() => ({
      eq: vi.fn(async () => ({
        data: roleName
          ? [{ sys_roles: { name: roleName } }]
          : [{ sys_roles: { name: "NHAN_VIEN_KSNK" } }],
        error: null,
      })),
    })),
  });
  mocks.createAdminSupabaseClient.mockReturnValue({ from: mocks.from });
}

describe("ADM-01 login email change gate", () => {
  const supabase = {
    from: vi.fn(),
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTrustedAdminEmail.mockImplementation((email: string | null | undefined) => {
      const e = String(email || "").toLowerCase();
      return e === "breakglass@example.test";
    });
    mocks.verifyCurrentActorPassword.mockResolvedValue({ ok: true });
  });

  it("rejects non-admin actor (reproduces NHAN_SU.edit hole)", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({
      id: "staff-user",
      email: "staff@example.test",
    });
    mockRoleQuery("NHAN_VIEN_KSNK");

    await expect(ensureAdminForLoginEmailChange()).rejects.toThrow(
      /Chỉ quản trị hệ thống/,
    );
  });

  it("rejects email change to break-glass address", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({
      id: "admin-user",
      email: "admin@example.test",
    });
    mockRoleQuery("ADMIN");
    (supabase as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ sys_roles: { name: "NHAN_VIEN_KSNK" } }],
          error: null,
        })),
      })),
    }));

    await expect(
      assertLoginEmailChangeAllowed({
        supabase,
        authUserId: "target-1",
        oldEmail: "old@example.test",
        newEmailRaw: "breakglass@example.test",
        confirmActorPassword: "secret",
      }),
    ).rejects.toThrow(/email quyền khẩn cấp/);
  });

  it("rejects changing another ADMIN account email", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({
      id: "admin-actor",
      email: "admin@example.test",
    });
    mockRoleQuery("ADMIN");
    (supabase as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ sys_roles: { name: "ADMIN" } }],
          error: null,
        })),
      })),
    }));

    await expect(
      assertLoginEmailChangeAllowed({
        supabase,
        authUserId: "other-admin",
        oldEmail: "other-admin@example.test",
        newEmailRaw: "new@example.test",
        confirmActorPassword: "secret",
      }),
    ).rejects.toThrow(/tài khoản quản trị khác/);
  });

  it("allows ADMIN changing own email after password reauth", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({
      id: "admin-actor",
      email: "admin@example.test",
    });
    mockRoleQuery("ADMIN");
    (supabase as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ sys_roles: { name: "ADMIN" } }],
          error: null,
        })),
      })),
    }));

    const res = await assertLoginEmailChangeAllowed({
      supabase,
      authUserId: "admin-actor",
      oldEmail: "admin@example.test",
      newEmailRaw: "admin2@example.test",
      confirmActorPassword: "secret",
    });
    expect(res.newEmail).toBe("admin2@example.test");
    expect(mocks.verifyCurrentActorPassword).toHaveBeenCalledWith("secret");
  });

  it("rejects when confirm password missing", async () => {
    mocks.getRequestAuthUser.mockResolvedValue({
      id: "admin-actor",
      email: "admin@example.test",
    });
    mockRoleQuery("ADMIN");
    mocks.verifyCurrentActorPassword.mockResolvedValue({
      ok: false,
      error: "Nhập mật khẩu của bạn để xác nhận.",
    });
    (supabase as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({
          data: [{ sys_roles: { name: "NHAN_VIEN_KSNK" } }],
          error: null,
        })),
      })),
    }));

    await expect(
      assertLoginEmailChangeAllowed({
        supabase,
        authUserId: "target-1",
        oldEmail: "old@example.test",
        newEmailRaw: "new@example.test",
        confirmActorPassword: "",
      }),
    ).rejects.toThrow(/mật khẩu/i);
  });
});
