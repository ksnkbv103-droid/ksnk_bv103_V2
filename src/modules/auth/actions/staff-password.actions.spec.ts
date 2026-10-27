import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Lát ACC-2: redirectTo dựng ở server; đổi mật khẩu dùng email của phiên, không tin email client. */
const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
  staffMaybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => {
  const chain = () => {
    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.eq = () => q;
    q.update = () => q;
    q.maybeSingle = mocks.staffMaybeSingle;
    return q;
  };
  return {
    createAdminSupabaseClient: () => ({ from: () => chain() }),
    createServerSupabaseClient: () => ({ auth: { resetPasswordForEmail: mocks.resetPasswordForEmail } }),
    createServerSupabaseUserClient: async () => ({
      auth: {
        getUser: mocks.getUser,
        signInWithPassword: mocks.signInWithPassword,
        updateUser: mocks.updateUser,
      },
    }),
  };
});

import { changePasswordWithReauth, requestPasswordResetEmail } from "./staff-password.actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staffMaybeSingle.mockResolvedValue({ data: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requestPasswordResetEmail", () => {
  it("dựng redirectTo từ NEXT_PUBLIC_SITE_URL, không nhận tham số client", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ksnk.example.vn/");
    const res = await requestPasswordResetEmail("A@BV103.vn");
    expect(res.ok).toBe(true);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("a@bv103.vn", {
      redirectTo: "https://ksnk.example.vn/login/reset-password",
    });
  });

  it("tham số thừa từ client (redirect độc) bị bỏ qua", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ksnk.example.vn");
    const call = requestPasswordResetEmail as unknown as (e: string, r: string) => Promise<unknown>;
    await call("a@bv103.vn", "https://evil.example/steal");
    expect(mocks.resetPasswordForEmail.mock.calls[0][1].redirectTo).toBe(
      "https://ksnk.example.vn/login/reset-password",
    );
  });
});

describe("changePasswordWithReauth", () => {
  it("xác thực bằng email của phiên", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "Self@BV103.vn", user_metadata: {} } } });
    const res = await changePasswordWithReauth("old-pass", "new-pass-123");
    expect(res.ok).toBe(true);
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({ email: "self@bv103.vn", password: "old-pass" });
  });

  it("không có phiên → từ chối, không gọi đăng nhập", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    const res = await changePasswordWithReauth("old-pass", "new-pass-123");
    expect(res.ok).toBe(false);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
