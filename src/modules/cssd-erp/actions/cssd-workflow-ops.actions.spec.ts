import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  updates: [] as unknown[],
  append: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.or = () => chain;
      chain.maybeSingle = async () => ({ data: { metadata: {}, lo_tiet_khuan_id: null }, error: null });
      chain.update = (patch: unknown) => {
        mocks.updates.push(patch);
        return { eq: () => ({ select: async () => ({ data: [{ id: "q1" }], error: null }) }) };
      };
      // truy vấn phiếu sự cố: await trực tiếp sau .eq("is_active", true)
      chain.then = (res: (v: unknown) => unknown) => res({ data: [], error: null });
      return chain;
    },
  }),
  createServerSupabaseUserClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u", email: "op@b.c" } } }) },
  }),
}));
vi.mock("./cssd-action-common", () => ({
  revalidateCssdIncidentSurfaces: vi.fn(),
  tableHasColumn: async () => true,
  appendQuyTrinhException: mocks.append,
}));
vi.mock("@/lib/cssd-server-gates", () => ({ verifyCssdInventoryEdit: vi.fn(async () => undefined) }));
vi.mock("@/modules/cssd-su-co/actions/su-co-report.actions", () => ({ createIncidentReport: vi.fn() }));
vi.mock("../shared/application/cssd-workflow-resolve", () => ({
  fetchActiveQuyTrinhByScanCode: async () => ({ id: "q1", ma_qr_quy_trinh: "B01" }),
}));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: async () => null }));

import { unlockDongBangQuyTrinhByMaQr } from "./cssd-workflow-ops.actions";

describe("unlockDongBangQuyTrinhByMaQr (CSSD-023)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updates.length = 0;
  });

  it("ghi nhật ký MO_DONG_BANG không soft rồi mới mở khóa", async () => {
    mocks.append.mockResolvedValue({ ok: true });
    const res = await unlockDongBangQuyTrinhByMaQr("b01");
    expect(res).toEqual({ success: true });
    expect(mocks.append.mock.calls[0][2]).toMatchObject({ su_kien: "MO_DONG_BANG" });
    expect(mocks.append.mock.calls[0][3]).toBeUndefined();
    expect(mocks.updates).toHaveLength(1);
  });

  it("ghi nhật ký lỗi thì không mở khóa và báo lỗi", async () => {
    mocks.append.mockRejectedValue(new Error("rpc down"));
    await expect(unlockDongBangQuyTrinhByMaQr("b01")).rejects.toThrow("rpc down");
    expect(mocks.updates).toHaveLength(0);
  });
});
