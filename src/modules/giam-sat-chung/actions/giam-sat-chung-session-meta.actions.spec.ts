import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUPERVISION_SESSION_MUTATION_EXPIRED_VI } from "@/lib/supervision-mutation-window";
import { deleteGiamSatChungSessions } from "./giam-sat-chung-session-meta.actions";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  hasBypass: vi.fn(),
  getActorNhanSuId: vi.fn(),
  revalidateGscPaths: vi.fn(),
  assertLock: vi.fn(),
  from: vi.fn(),
  sessionsSelectIn: vi.fn(),
  sessionsDeleteIn: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  hasRBACAdminSupervisionBypass: mocks.hasBypass,
}));

vi.mock("@/lib/actor-auth-server", () => ({
  getActorNhanSuId: mocks.getActorNhanSuId,
}));

vi.mock("../lib/revalidate-gsc-paths", () => ({
  revalidateGscPaths: mocks.revalidateGscPaths,
}));

vi.mock("@/lib/supervision-module-lock", () => ({
  assertSupervisionNotLockedForDate: mocks.assertLock,
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: mocks.from,
  }),
}));

describe("deleteGiamSatChungSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.hasBypass.mockResolvedValue(false);
    mocks.getActorNhanSuId.mockResolvedValue("ns-01");
    mocks.sessionsSelectIn.mockResolvedValue({
      data: [
        {
          id: "s1",
          nguoi_giam_sat_id: "ns-01",
          is_active: true,
          created_at: "2020-01-01T00:00:00.000Z",
          ngay_giam_sat: "2020-01-01",
        },
      ],
      error: null,
    });
    mocks.sessionsDeleteIn.mockResolvedValue({ error: null });
    mocks.from.mockImplementation((table: string) => {
      if (table === "gstt_fact_chung_sessions" || table === "gstt_fact_chung_sessions") {
        return {
          select: () => ({ in: mocks.sessionsSelectIn }),
          delete: () => ({ in: mocks.sessionsDeleteIn }),
        };
      }
      return {
        select: () => ({ in: vi.fn() }),
        delete: () => ({ in: vi.fn() }),
      };
    });
  });

  it("rejects deletion when mutation window expired for non-admin", async () => {
    const result = await deleteGiamSatChungSessions(["s1"]);

    expect(result).toEqual({ success: false, error: SUPERVISION_SESSION_MUTATION_EXPIRED_VI });
    expect(mocks.sessionsDeleteIn).not.toHaveBeenCalled();
  });

  it("allows admin bypass to delete expired sessions", async () => {
    mocks.hasBypass.mockResolvedValue(true);

    const result = await deleteGiamSatChungSessions(["s1"]);

    expect(result).toEqual({ success: true });
    expect(mocks.sessionsDeleteIn).toHaveBeenCalledWith("id", ["s1"]);
    expect(mocks.revalidateGscPaths).toHaveBeenCalled();
  });
});
