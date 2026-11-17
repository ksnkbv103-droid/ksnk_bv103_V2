import { beforeEach, describe, expect, it, vi } from "vitest";

const SID = "11111111-1111-4111-8111-111111111111";
const RID = "22222222-2222-4222-8222-222222222222";

const m = vi.hoisted(() => ({
  req: null as Record<string, unknown> | null,
  updates: [] as Array<Record<string, unknown>>,
  rpcCalls: [] as unknown[],
  rpcError: null as unknown,
  softDeletes: 0,
  audits: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(),
  getActorRoleNames: vi.fn().mockResolvedValue(["CHU_NHIEM_KHOA"]),
}));
vi.mock("@/lib/actor-auth-server", () => ({ getActorAuthUserId: vi.fn().mockResolvedValue("u-duyet") }));
vi.mock("@/lib/supervision-module-lock", () => ({ assertSupervisionNotLockedForDate: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: vi.fn(async (a: Record<string, unknown>) => {
    m.audits.push(a);
  }),
}));
vi.mock("@/lib/analytics/strategic-analytics-cache", () => ({ invalidateVstStrategicAnalyticsCache: vi.fn() }));
vi.mock("@/lib/data-access", () => ({
  getDb: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: m.req, error: null }) }) }),
      update: (v: Record<string, unknown>) => {
        m.updates.push(v);
        const chain = { eq: () => chain, select: async () => ({ data: [{ id: RID }], error: null }), then: undefined };
        return chain;
      },
    }),
  }),
}));
vi.mock("../repo/vst.repo", () => ({
  vstRepo: {
    findVstSessionsForDelete: async () => ({
      data: [{ id: SID, nguoi_giam_sat_id: "ns-1", is_active: true, created_at: "2026-11-01T00:00:00Z", ngay_giam_sat: "2026-11-01" }],
      error: null,
    }),
    findActiveVstObservations: async () => ({ data: [{ nhan_vien_id: "nv-1", metadata: {} }], error: null }),
    softDeleteVstSessions: async () => {
      m.softDeletes += 1;
      return { data: [{ id: SID }], error: null };
    },
    saveVstSessionViaRpc: async (p: unknown) => {
      m.rpcCalls.push(p);
      return { data: { session_id: SID }, error: m.rpcError };
    },
  },
}));

import { approveVstYeuCauAction } from "./vst-yeu-cau-dieu-chinh.actions";

const payload = {
  session: { khoa_id: "k-1", ngay_giam_sat: "2026-11-01" },
  observations: [{ hanh_dong: "Rửa tay" }, { hanh_dong: "Bỏ sót" }],
};

// @dac-ta T1.33
describe("approveVstYeuCauAction — yêu cầu SỬA (R1.24)", () => {
  beforeEach(() => {
    m.updates.length = 0;
    m.rpcCalls.length = 0;
    m.audits.length = 0;
    m.rpcError = null;
    m.softDeletes = 0;
    m.req = {
      id: RID,
      session_id: SID,
      loai: "SUA",
      ly_do: "ghi nhầm hành động",
      trang_thai: "CHO_DUYET",
      payload,
      nguoi_yeu_cau_auth_id: "u-yeu-cau",
      nguoi_yeu_cau_nhan_su_id: "ns-1",
    };
  });

  it("duyệt: áp nội dung đề nghị qua RPC lưu phiên, ghi nhật ký trước/sau, không vô hiệu phiên", async () => {
    const r = await approveVstYeuCauAction(RID);
    expect(r).toEqual({ success: true });
    expect(m.rpcCalls).toEqual([{ sessionId: SID, session: payload.session, observations: payload.observations }]);
    expect(m.softDeletes).toBe(0);
    expect(m.audits).toHaveLength(1);
    expect(m.audits[0]).toMatchObject({
      action: "VST_EDIT_SESSION_AFTER_WINDOW",
      targetId: SID,
      reason: "ghi nhầm hành động",
      actorUserId: "u-duyet",
      before: { so_co_hoi: 1 },
      after: { so_co_hoi: 2, yeu_cau_id: RID },
    });
  });

  it("RPC lỗi: trả yêu cầu về chờ duyệt, báo lỗi", async () => {
    m.rpcError = new Error("RPC hỏng");
    const r = await approveVstYeuCauAction(RID);
    expect(r.success).toBe(false);
    expect(m.updates.at(-1)).toMatchObject({ trang_thai: "CHO_DUYET" });
    expect(m.audits).toHaveLength(0);
  });

  it("người tạo yêu cầu không tự duyệt", async () => {
    m.req = { ...m.req, nguoi_yeu_cau_auth_id: "u-duyet" };
    const r = await approveVstYeuCauAction(RID);
    expect(r.success).toBe(false);
    expect(m.rpcCalls).toHaveLength(0);
  });
});
