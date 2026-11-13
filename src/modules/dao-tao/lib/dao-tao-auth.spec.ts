import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const verifyPermission = vi.fn();
const getActorKsnkScope = vi.fn();

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: async () => ({ auth: { getUser } }),
}));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: (...a: unknown[]) => verifyPermission(...a),
  verifyAnyPermission: vi.fn(),
}));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({
  getActorKsnkScope: () => getActorKsnkScope(),
}));

import { requireDaoTaoUser } from "./dao-tao-auth";

describe("requireDaoTaoUser — QT-012 khách thống kê không vào Thi KSNK", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    verifyPermission.mockResolvedValue(undefined);
  });

  it("từ chối vai khách thống kê dù có DAO_TAO view", async () => {
    getActorKsnkScope.mockResolvedValue({ isGuestStatsOnly: true, isAdmin: false });
    await expect(requireDaoTaoUser()).rejects.toThrow(/khách thống kê/i);
  });

  it("cho nhân viên thường có DAO_TAO view", async () => {
    getActorKsnkScope.mockResolvedValue({ isGuestStatsOnly: false, isAdmin: false });
    await expect(requireDaoTaoUser()).resolves.toMatchObject({ user: { id: "u1" } });
  });
});
