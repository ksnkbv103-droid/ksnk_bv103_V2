import { beforeEach, describe, expect, it, vi } from "vitest";

// @dac-ta R1.24 — VST-027: CB_KSNK đề nghị sửa phiên của người khác (luôn qua yêu cầu chờ duyệt, giữ chủ phiên gốc).
const SID = "11111111-1111-4111-8111-111111111111";
const KHOA = "22222222-2222-4222-8222-222222222222";
const KV = "33333333-3333-4333-8333-333333333333";
const NV = "44444444-4444-4444-8444-444444444444";
const NGHE = "55555555-5555-4555-8555-555555555555";
const CHU_GOC = "66666666-6666-4666-8666-666666666666";
const NGUOI_GUI = "77777777-7777-4777-8777-777777777777";

const m = vi.hoisted(() => ({
  roles: [] as string[],
  createdAt: new Date().toISOString(),
  ownerId: "" as string,
  inserts: [] as Array<Record<string, unknown>>,
  rpcCalls: [] as unknown[],
  policyCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(),
  hasRBACAdminSupervisionBypass: vi.fn().mockResolvedValue(false),
  getActorRoleNames: vi.fn(async () => m.roles),
}));
vi.mock("@/lib/actor-auth-server", () => ({
  getActorNhanSuId: vi.fn().mockResolvedValue("77777777-7777-4777-8777-777777777777"),
  getActorAuthUserId: vi.fn().mockResolvedValue("u-gui"),
}));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({
  getActorKsnkScope: vi.fn().mockResolvedValue({
    isMangLuoiKsnk: false,
    isAdmin: false,
    isNhanVienKsnk: true,
    actorKhoaId: null,
  }),
}));
vi.mock("@/lib/master-data/fk-normalize", () => ({
  normalizeHoSoNhanVienOptionalOrThrow: async (_s: unknown, id: string) => id,
}));
vi.mock("@/lib/master-data/validation", () => ({
  normalizeAndValidateDmKhoaPhong: async ({ idRaw }: { idRaw: string }) => idRaw,
  validateDanhMucIdByType: vi.fn(),
}));
vi.mock("@/lib/supervision-module-lock", () => ({ assertSupervisionNotLockedForDate: vi.fn() }));
vi.mock("@/lib/khu-vuc-giam-sat-server", () => ({ assertKhuVucAllowedForKhoa: vi.fn() }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: vi.fn() }));
vi.mock("@/lib/analytics/strategic-analytics-cache", () => ({ invalidateVstStrategicAnalyticsCache: vi.fn() }));
vi.mock("@/lib/supervision-policy", async (orig) => {
  const actual = await orig<typeof import("@/lib/supervision-policy")>();
  return {
    ...actual,
    resolveSupervisorPolicy: vi.fn(async (p: Record<string, unknown>) => {
      m.policyCalls.push(p);
      return { derivedHinhThuc: actual.HINH_THUC_CHUYEN_TRACH };
    }),
  };
});
vi.mock("@/lib/data-access", () => ({
  getDb: async () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        m.inserts.push(row);
        return { error: null };
      },
    }),
  }),
}));
vi.mock("../repo/vst.repo", () => ({
  vstRepo: {
    findExistingVstSessionForSave: async () => ({
      data: {
        id: SID,
        nguoi_giam_sat_id: m.ownerId,
        is_active: true,
        created_at: m.createdAt,
        metadata: {},
        ngay_giam_sat: "2026-11-01",
      },
      error: null,
    }),
    findActiveVstObservations: async () => ({ data: [{ nhan_vien_id: NV, metadata: {} }], error: null }),
    findVstHinhThucByName: async () => ({ data: null }),
    findKhoaPhongIds: async () => ({ data: [{ id: KHOA }] }),
    saveVstSessionViaRpc: async (p: unknown) => {
      m.rpcCalls.push(p);
      return { data: { session_id: SID }, error: null };
    },
  },
}));

import { saveVSTSession } from "./vst-write-save-session.actions";

const session = {
  khoa_id: KHOA,
  khu_vuc_id: KV,
  nguoi_giam_sat_id: NGUOI_GUI,
  ngay_giam_sat: "2026-11-01",
  vi_tri: "Giường 1",
  cach_thuc_giam_sat: "Giám sát trực tiếp tại chỗ",
};
const observations = [
  {
    nhan_vien_id: NV,
    khoa_id: KHOA,
    khu_vuc: "",
    vi_tri: "Giường 1",
    nghe_nghiep_id: NGHE,
    nghe_nghiep: "Điều dưỡng",
    ngay_giam_sat: "2026-11-01",
    nguoi_giam_sat_id: NGUOI_GUI,
    opportunities: [{ thoi_diems: ["Trước khi tiếp xúc người bệnh"], hanh_dong: "Rửa tay bằng nước" }],
  },
] as never;

describe("saveVSTSession — CB_KSNK sửa phiên của người khác (VST-027)", () => {
  beforeEach(() => {
    m.roles = ["NHAN_VIEN_KSNK"];
    m.ownerId = CHU_GOC;
    m.createdAt = new Date().toISOString();
    m.inserts.length = 0;
    m.rpcCalls.length = 0;
    m.policyCalls.length = 0;
  });

  it("CB_KSNK, phiên còn trong 30 phút: vẫn chỉ tạo yêu cầu, KHÔNG ghi thẳng vào phiên", async () => {
    const r = await saveVSTSession(session, observations, {
      existingSessionId: SID,
      lyDoSua: "đính chính khu vực nhập nhầm",
    });
    expect(r).toMatchObject({ success: true, choDuyet: true });
    expect(m.rpcCalls).toHaveLength(0);
    expect(m.inserts).toHaveLength(1);
  });

  it("yêu cầu giữ chủ phiên gốc, không đổi sang người gửi", async () => {
    await saveVSTSession(session, observations, { existingSessionId: SID, lyDoSua: "đính chính khu vực nhập nhầm" });
    const row = m.inserts[0] as { loai: string; nguoi_yeu_cau_nhan_su_id: string; payload: { session: Record<string, unknown> } };
    expect(row.loai).toBe("SUA");
    expect(row.nguoi_yeu_cau_nhan_su_id).toBe(NGUOI_GUI);
    expect(row.payload.session.nguoi_giam_sat_id).toBe(CHU_GOC);
  });

  it("hình thức giám sát tính theo chủ phiên gốc, không theo người gửi", async () => {
    await saveVSTSession(session, observations, { existingSessionId: SID, lyDoSua: "đính chính khu vực nhập nhầm" });
    expect(m.policyCalls[0]).toMatchObject({ supervisorId: CHU_GOC });
  });

  it("thiếu lý do (< 10 ký tự): chặn, không tạo yêu cầu", async () => {
    const r = await saveVSTSession(session, observations, { existingSessionId: SID, lyDoSua: "nhầm" });
    expect(r.success).toBe(false);
    expect(m.inserts).toHaveLength(0);
    expect(m.rpcCalls).toHaveLength(0);
  });

  it("không phải chủ phiên và không phải CB_KSNK: từ chối", async () => {
    m.roles = ["NHAN_VIEN_KHOA"];
    const r = await saveVSTSession(session, observations, { existingSessionId: SID, lyDoSua: "đính chính khu vực nhập nhầm" });
    expect(r.success).toBe(false);
    expect(m.inserts).toHaveLength(0);
    expect(m.rpcCalls).toHaveLength(0);
  });

  it("chủ phiên trong 30 phút: ghi thẳng như cũ", async () => {
    m.roles = ["NHAN_VIEN_KHOA"];
    m.ownerId = NGUOI_GUI;
    const r = await saveVSTSession(session, observations, { existingSessionId: SID });
    expect(r.success).toBe(true);
    expect(m.rpcCalls).toHaveLength(1);
    expect(m.inserts).toHaveLength(0);
  });
});
