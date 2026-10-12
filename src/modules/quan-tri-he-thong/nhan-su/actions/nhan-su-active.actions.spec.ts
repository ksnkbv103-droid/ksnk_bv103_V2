import { beforeEach, describe, expect, it, vi } from "vitest";

/** Lát ACC-2: bật/tắt, xóa mềm hồ sơ nhân sự từ bảng → ban/bỏ ban Auth + xóa cache quyền. */
const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  invalidateUserPermissionsCache: vi.fn(),
  authUserHasAdminRole: vi.fn(),
  updateUserById: vi.fn(),
  rows: [] as Array<{ id: string; auth_user_id: string | null; is_active: boolean }>,
  updateIn: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  invalidateUserPermissionsCache: mocks.invalidateUserPermissionsCache,
}));
vi.mock("./nhan-su-login-email.guard", () => ({ authUserHasAdminRole: mocks.authUserHasAdminRole }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({ in: async () => ({ data: mocks.rows, error: null }) }),
      update: () => ({ in: mocks.updateIn }),
    }),
    auth: { admin: { updateUserById: mocks.updateUserById } },
  }),
}));

import { setNhanSuActiveAction } from "./nhan-su-active.actions";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyPermission.mockResolvedValue(undefined);
  mocks.authUserHasAdminRole.mockResolvedValue(false);
  mocks.updateUserById.mockResolvedValue({ error: null });
  mocks.updateIn.mockResolvedValue({ error: null });
  mocks.rows = [
    { id: A, auth_user_id: "auth-a", is_active: true },
    { id: B, auth_user_id: null, is_active: true },
  ];
});

describe("setNhanSuActiveAction", () => {
  it("xóa mềm: cần quyền delete, ban user Auth đã liên kết, xóa cache quyền", async () => {
    const res = await setNhanSuActiveAction({ ids: [A, B], active: false, mode: "delete" });
    expect(res).toMatchObject({ success: true, count: 2 });
    expect(mocks.verifyPermission).toHaveBeenCalledWith("NHAN_SU", "delete");
    expect(mocks.updateUserById).toHaveBeenCalledTimes(1);
    expect(mocks.updateUserById).toHaveBeenCalledWith("auth-a", { ban_duration: "876000h" });
    expect(mocks.invalidateUserPermissionsCache).toHaveBeenCalled();
  });

  it("bật lại: bỏ ban", async () => {
    mocks.rows = [{ id: A, auth_user_id: "auth-a", is_active: false }];
    const res = await setNhanSuActiveAction({ ids: [A], active: true, mode: "toggle" });
    expect(res.success).toBe(true);
    expect(mocks.verifyPermission).toHaveBeenCalledWith("NHAN_SU", "edit");
    expect(mocks.updateUserById).toHaveBeenCalledWith("auth-a", { ban_duration: "none" });
  });

  it("không ngưng hồ sơ gắn tài khoản ADMIN, không ghi DB", async () => {
    mocks.authUserHasAdminRole.mockResolvedValue(true);
    const res = await setNhanSuActiveAction({ ids: [A], active: false, mode: "toggle" });
    expect(res).toMatchObject({ success: false, error: expect.stringContaining("ADMIN") });
    expect(mocks.updateIn).not.toHaveBeenCalled();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("id không phải UUID → từ chối trước khi kiểm quyền", async () => {
    const res = await setNhanSuActiveAction({ ids: ["x"], active: false, mode: "toggle" });
    expect(res.success).toBe(false);
    expect(mocks.verifyPermission).not.toHaveBeenCalled();
  });
});
