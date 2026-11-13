import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** QT-011: thiết lập tài khoản khách không được đụng email khẩn cấp hay tài khoản quản trị. */
const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  getUserById: vi.fn(),
  updateUserById: vi.fn(),
  createUser: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => {
  const chain = () => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.update = (...a: unknown[]) => {
      mocks.update(...a);
      return q;
    };
    q.insert = (...a: unknown[]) => {
      mocks.insert(...a);
      return q;
    };
    q.maybeSingle = mocks.maybeSingle;
    return q;
  };
  return {
    createAdminSupabaseClient: () => ({
      from: () => chain(),
      auth: {
        admin: {
          getUserById: mocks.getUserById,
          updateUserById: mocks.updateUserById,
          createUser: mocks.createUser,
        },
      },
    }),
  };
});
vi.mock("@/lib/server-permission", () => ({ invalidateUserPermissionsCache: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: vi.fn() }));
vi.mock("@/modules/quan-tri-he-thong/phan-quyen/actions/rbac-auth.helpers", () => ({
  ensureRbacAdmin: vi.fn().mockResolvedValue({ id: "admin-1", email: "admin@bv103.vn" }),
}));
vi.mock("@/lib/auth/staff-auth-email", () => ({ ensureStaffAuthEmailMatchesProfile: vi.fn() }));
vi.mock("@/modules/quan-tri-he-thong/actions/revalidate-quan-tri", () => ({ revalidateNhanSuTaiKhoan: vi.fn() }));
vi.mock("../lib/admin-reauth", () => ({ verifyCurrentActorPassword: vi.fn().mockResolvedValue({ ok: true }) }));

import { setupGuestStatsPilotAccountAction } from "./guest-stats-pilot.actions";

const input = { password: "Matkhau@12345", confirmActorPassword: "x" };

function expectNoWrite() {
  expect(mocks.update).not.toHaveBeenCalled();
  expect(mocks.insert).not.toHaveBeenCalled();
  expect(mocks.updateUserById).not.toHaveBeenCalled();
  expect(mocks.createUser).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("KSNK_BREAK_GLASS_EMAILS", "khancap@bv103.vn");
});
afterEach(() => vi.unstubAllEnvs());

describe("QT-011 setupGuestStatsPilotAccountAction", () => {
  it("email khẩn cấp: từ chối, không ghi gì", async () => {
    const res = await setupGuestStatsPilotAccountAction({ ...input, email: "KhanCap@bv103.vn" });
    expect(res).toMatchObject({ success: false, error: expect.stringContaining("khẩn cấp") });
    expectNoWrite();
  });

  it("hồ sơ khách đang gắn tài khoản mang vai ADMIN: từ chối, không ghi gì", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { id: "role-1" } }) // vai trò Khách
      .mockResolvedValueOnce({ data: { id: "ns1", auth_user_id: "u1", extra_data: {}, is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { role_names: ["admin"] } });
    mocks.getUserById.mockResolvedValue({ data: { user: { email: "ai-do@bv103.vn" } } });
    const res = await setupGuestStatsPilotAccountAction({ ...input, email: "khach@bv103.vn" });
    expect(res).toMatchObject({ success: false, error: expect.stringContaining("tài khoản quản trị") });
    expectNoWrite();
  });

  it("hồ sơ khách đang gắn tài khoản khẩn cấp: từ chối, không ghi gì", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { id: "role-1" } })
      .mockResolvedValueOnce({ data: { id: "ns1", auth_user_id: "u1", extra_data: {}, is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { role_names: [] } });
    mocks.getUserById.mockResolvedValue({ data: { user: { email: "khancap@bv103.vn" } } });
    const res = await setupGuestStatsPilotAccountAction({ ...input, email: "khach@bv103.vn" });
    expect(res).toMatchObject({ success: false, error: expect.stringContaining("tài khoản quản trị") });
    expectNoWrite();
  });

  it("đọc vai trò lỗi: không coi là «không có vai», từ chối, không ghi gì", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { id: "role-1" } })
      .mockResolvedValueOnce({ data: { id: "ns1", auth_user_id: "u1", extra_data: {}, is_active: true }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "view lỗi" } });
    mocks.getUserById.mockResolvedValue({ data: { user: { email: "ai-do@bv103.vn" } }, error: null });
    const res = await setupGuestStatsPilotAccountAction({ ...input, email: "khach@bv103.vn" });
    expect(res.success).toBe(false);
    expectNoWrite();
  });

  it("đọc Auth user lỗi: từ chối, không ghi gì", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { id: "role-1" } })
      .mockResolvedValueOnce({ data: { id: "ns1", auth_user_id: "u1", extra_data: {}, is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { role_names: [] }, error: null });
    mocks.getUserById.mockResolvedValue({ data: { user: null }, error: { message: "auth lỗi" } });
    const res = await setupGuestStatsPilotAccountAction({ ...input, email: "khach@bv103.vn" });
    expect(res.success).toBe(false);
    expectNoWrite();
  });
});
