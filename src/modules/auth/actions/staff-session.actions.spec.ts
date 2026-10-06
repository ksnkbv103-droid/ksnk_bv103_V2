import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const cacheStore = new Map<string, unknown>();
  return {
    cacheStore,
    getUser: vi.fn(),
    maybeSingle: vi.fn(),
    createServerSupabaseUserClient: vi.fn(),
  };
});

vi.mock("next/cache", () => ({
  // Mô phỏng unstable_cache: lưu return, không lưu khi throw.
  unstable_cache: (fn: (...args: string[]) => Promise<unknown>, keyParts: string[]) => {
    return async (...args: string[]) => {
      const key = JSON.stringify([keyParts, args]);
      if (mocks.cacheStore.has(key)) return mocks.cacheStore.get(key);
      try {
        const result = await fn(...args);
        mocks.cacheStore.set(key, result);
        return result;
      } catch (e) {
        throw e;
      }
    };
  },
}));

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: mocks.createServerSupabaseUserClient,
}));

import { checkStaffSessionAllowed } from "./staff-session.actions";

function mockUserClient(userId: string | null) {
  mocks.getUser.mockResolvedValue({
    data: { user: userId ? { id: userId } : null },
  });
  mocks.createServerSupabaseUserClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mocks.maybeSingle,
        }),
      }),
    }),
  });
}

describe("checkStaffSessionAllowed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheStore.clear();
  });

  it("(a) view trả error → check_failed", async () => {
    mockUserClient("u1");
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(checkStaffSessionAllowed()).resolves.toEqual({
      ok: false,
      reason: "check_failed",
    });
  });

  it("(b) is_active=false → inactive", async () => {
    mockUserClient("u1");
    mocks.maybeSingle.mockResolvedValue({
      data: { staff_id: "s1", is_active: false },
      error: null,
    });

    await expect(checkStaffSessionAllowed()).resolves.toEqual({
      ok: false,
      reason: "inactive",
    });
  });

  it("(c) không có dòng → ok:true", async () => {
    mockUserClient("u1");
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(checkStaffSessionAllowed()).resolves.toEqual({ ok: true });
  });

  it("(d) không user → no_user", async () => {
    mockUserClient(null);

    await expect(checkStaffSessionAllowed()).resolves.toEqual({
      ok: false,
      reason: "no_user",
    });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("(e) lỗi/inactive không bị cache — lần 2 active → ok", async () => {
    mockUserClient("u1");

    mocks.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "timeout" },
    });
    await expect(checkStaffSessionAllowed()).resolves.toEqual({
      ok: false,
      reason: "check_failed",
    });

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { staff_id: "s1", is_active: true },
      error: null,
    });
    await expect(checkStaffSessionAllowed()).resolves.toEqual({ ok: true });

    mocks.cacheStore.clear();
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { staff_id: "s1", is_active: false },
      error: null,
    });
    await expect(checkStaffSessionAllowed()).resolves.toEqual({
      ok: false,
      reason: "inactive",
    });

    mocks.maybeSingle.mockResolvedValueOnce({
      data: { staff_id: "s1", is_active: true },
      error: null,
    });
    await expect(checkStaffSessionAllowed()).resolves.toEqual({ ok: true });
  });
});
