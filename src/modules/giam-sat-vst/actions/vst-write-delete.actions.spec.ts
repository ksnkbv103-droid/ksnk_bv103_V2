import { beforeEach, describe, expect, it, vi } from "vitest";

const SID = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  updateResult: { data: [{ id: "x" }] as unknown[] | null, error: null as unknown },
  eqCalls: [] as Array<[string, unknown]>,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(),
  hasRBACAdminSupervisionBypass: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/actor-auth-server", () => ({
  getActorNhanSuId: vi.fn().mockResolvedValue("ns-1"),
  getActorAuthUserId: vi.fn().mockResolvedValue("u-1"),
}));
vi.mock("@/lib/supervision-module-lock", () => ({ assertSupervisionNotLockedForDate: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: vi.fn() }));
vi.mock("@/lib/analytics/strategic-analytics-cache", () => ({ invalidateVstStrategicAnalyticsCache: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        in: async () => ({
          data: [
            { id: SID, nguoi_giam_sat_id: "ns-1", is_active: true, created_at: new Date().toISOString(), ngay_giam_sat: "2026-11-01" },
          ],
          error: null,
        }),
      }),
      update: () => {
        const chain = {
          in: () => chain,
          eq: (c: string, v: unknown) => {
            m.eqCalls.push([c, v]);
            return chain;
          },
          select: async () => m.updateResult,
        };
        return chain;
      },
    }),
  }),
}));

import { deleteVSTSessions } from "./vst-write-delete.actions";

describe("deleteVSTSessions", () => {
  beforeEach(() => {
    m.eqCalls.length = 0;
    m.updateResult = { data: [{ id: SID }], error: null };
  });

  it("UPDATE có điều kiện is_active=true", async () => {
    const r = await deleteVSTSessions([SID], { lyDo: "nhập nhầm" });
    expect(r.success).toBe(true);
    expect(m.eqCalls).toContainEqual(["is_active", true]);
  });

  it("0 dòng bị cập nhật (race) thì báo lỗi, không báo thành công", async () => {
    m.updateResult = { data: [], error: null };
    const r = await deleteVSTSessions([SID], { lyDo: "nhập nhầm" });
    expect(r.success).toBe(false);
  });
});
