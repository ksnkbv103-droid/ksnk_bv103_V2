import { beforeEach, describe, expect, it, vi } from "vitest";

const SID = "11111111-1111-4111-8111-111111111111";

const m = vi.hoisted(() => ({
  updateResult: { data: [{ id: "x" }] as unknown[] | null, error: null as unknown },
  eqCalls: [] as Array<[string, unknown]>,
  createdAt: null as string | null,
  inserts: [] as unknown[],
  updateCount: 0,
  ownerId: "ns-1",
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(),
  hasRBACAdminSupervisionBypass: vi.fn().mockResolvedValue(false),
  getActorRoleNames: vi.fn().mockResolvedValue([]),
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
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: SID, nguoi_giam_sat_id: m.ownerId, is_active: true, created_at: m.createdAt ?? new Date().toISOString(), ngay_giam_sat: "2026-11-01" },
            error: null,
          }),
        }),
        in: async () => ({
          data: [
            { id: SID, nguoi_giam_sat_id: "ns-1", is_active: true, created_at: m.createdAt ?? new Date().toISOString(), ngay_giam_sat: "2026-11-01" },
          ],
          error: null,
        }),
      }),
      insert: async (rows: unknown) => {
        m.inserts.push(rows);
        return { error: null };
      },
      update: () => {
        m.updateCount += 1;
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

import { assertCanEditVSTSession, deleteVSTSessions } from "./vst-write-delete.actions";

describe("deleteVSTSessions", () => {
  beforeEach(() => {
    m.eqCalls.length = 0;
    m.inserts.length = 0;
    m.updateCount = 0;
    m.createdAt = null;
    m.ownerId = "ns-1";
    m.updateResult = { data: [{ id: SID }], error: null };
  });

  it("UPDATE có điều kiện is_active=true", async () => {
    const r = await deleteVSTSessions([SID], { lyDo: "nhập nhầm khoa" });
    expect(r.success).toBe(true);
    expect(m.eqCalls).toContainEqual(["is_active", true]);
  });

  it("0 dòng bị cập nhật (race) thì báo lỗi, không báo thành công", async () => {
    m.updateResult = { data: [], error: null };
    const r = await deleteVSTSessions([SID], { lyDo: "nhập nhầm khoa" });
    expect(r.success).toBe(false);
  });

  // @dac-ta T1.33
  it("chủ phiên quá 30 phút: tạo yêu cầu chờ duyệt, KHÔNG vô hiệu phiên", async () => {
    m.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const r = await deleteVSTSessions([SID], { lyDo: "nhập nhầm khoa" });
    expect(r).toEqual({ success: true, choDuyet: 1 });
    expect(m.updateCount).toBe(0);
    expect(m.inserts).toEqual([
      [{ session_id: SID, loai: "XOA", ly_do: "nhập nhầm khoa", nguoi_yeu_cau_auth_id: "u-1", nguoi_yeu_cau_nhan_su_id: "ns-1" }],
    ]);
  });

  it("lý do dưới 10 ký tự: chặn, không tạo yêu cầu", async () => {
    m.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const r = await deleteVSTSessions([SID], { lyDo: "nhầm 1" });
    expect(r.success).toBe(false);
    expect(m.inserts).toHaveLength(0);
  });
});

// @dac-ta T1.33
describe("assertCanEditVSTSession (R1.24)", () => {
  beforeEach(() => {
    m.createdAt = null;
    m.ownerId = "ns-1";
  });

  it("chủ phiên trong 30 phút: sửa trực tiếp, không cần lý do", async () => {
    expect(await assertCanEditVSTSession(SID)).toEqual({ success: true, requiresReason: false, choDuyet: false });
  });

  it("chủ phiên quá 30 phút: được mở form, phải ghi lý do và chờ duyệt", async () => {
    m.createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(await assertCanEditVSTSession(SID)).toEqual({ success: true, requiresReason: true, choDuyet: true });
  });

  it("không phải chủ phiên: chặn", async () => {
    m.ownerId = "ns-khac";
    expect((await assertCanEditVSTSession(SID)).success).toBe(false);
  });
});
