import { beforeEach, describe, expect, it, vi } from "vitest";

const getRequestAuthUser = vi.fn();
const maybeSingle = vi.fn();

vi.mock("@/lib/auth/rbac-request", () => ({ getRequestAuthUser: () => getRequestAuthUser() }));
vi.mock("@/lib/auth/trusted-admin-email", () => ({ isTrustedAdminEmail: () => false }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }) }),
  }),
}));
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));
vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

import {
  getActorRoleNames,
  hasRBACAdminSupervisionBypass,
  verifyAllAnyPermissionGroups,
  verifyAnyPermission,
  verifyPermission,
} from "./server-permission";

const CHECK = { moduleKey: "giam_sat_vst", action: "view" };
const MSG = "Bạn cần đổi mật khẩu trước khi tiếp tục.";

describe("server-permission — cờ must_change_password", () => {
  beforeEach(() => {
    getRequestAuthUser.mockReset();
    maybeSingle.mockReset();
    // ADMIN: nếu cờ không chặn thì mọi gate đều cho qua.
    maybeSingle.mockResolvedValue({ data: { roles: ["ADMIN"], permissions: [] }, error: null });
  });

  it("chặn mọi gate khi cờ nằm ở app_metadata, kể cả vai trò ADMIN", async () => {
    getRequestAuthUser.mockResolvedValue({ id: "u1", app_metadata: { must_change_password: true } });
    await expect(verifyPermission(CHECK.moduleKey, CHECK.action)).rejects.toThrow(MSG);
    await expect(verifyAnyPermission([CHECK])).rejects.toThrow(MSG);
    await expect(verifyAllAnyPermissionGroups([[CHECK]])).rejects.toThrow(MSG);
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  it("có cờ thì không có vai trò, không có bypass giám sát", async () => {
    getRequestAuthUser.mockResolvedValue({ id: "u1", app_metadata: { must_change_password: true } });
    await expect(getActorRoleNames()).resolves.toEqual([]);
    await expect(hasRBACAdminSupervisionBypass()).resolves.toBe(false);
    getRequestAuthUser.mockResolvedValue({ id: "u1", app_metadata: {} });
    await expect(getActorRoleNames()).resolves.toEqual(["ADMIN"]);
    await expect(hasRBACAdminSupervisionBypass()).resolves.toBe(true);
  });

  it("chặn khi cờ chỉ nằm ở user_metadata", async () => {
    getRequestAuthUser.mockResolvedValue({ id: "u1", user_metadata: { must_change_password: true } });
    await expect(verifyPermission(CHECK.moduleKey, CHECK.action)).rejects.toThrow(MSG);
  });

  it("cho qua khi cờ đã tắt", async () => {
    getRequestAuthUser.mockResolvedValue({
      id: "u1",
      app_metadata: { must_change_password: false },
      user_metadata: {},
    });
    await expect(verifyPermission(CHECK.moduleKey, CHECK.action)).resolves.toBeUndefined();
    await expect(verifyAnyPermission([CHECK])).resolves.toBeUndefined();
    await expect(verifyAllAnyPermissionGroups([[CHECK]])).resolves.toBeUndefined();
  });

  it("chưa đăng nhập vẫn báo chưa đăng nhập", async () => {
    getRequestAuthUser.mockResolvedValue(null);
    await expect(verifyPermission(CHECK.moduleKey, CHECK.action)).rejects.toThrow("Bạn chưa đăng nhập.");
  });
});
