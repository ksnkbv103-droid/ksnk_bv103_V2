import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ restriction: vi.fn(), eq: vi.fn(), limit: vi.fn(), order: [] as string[] }));

const perm = vi.hoisted(() => ({ verifyPermissions: vi.fn(async (_r: unknown) => {}) }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
  verifyPermissions: perm.verifyPermissions,
}));
vi.mock("@/lib/cssd-nkbv-trace", () => ({ resolveCssdQuyTrinhLinkFromMaQr: vi.fn() }));
vi.mock("@/modules/cssd-su-co/domain/cssd-incident-attributes", () => ({
  readLoTietKhuanId: vi.fn(),
  readIncidentTypeLabel: vi.fn(),
}));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({ getNkbvKhoaRestriction: mocks.restriction }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (...a: unknown[]) => {
        mocks.order.push(`eq:${String(a[0])}`);
        mocks.eq(...a);
        return chain;
      };
      chain.limit = (...a: unknown[]) => {
        mocks.order.push("limit");
        mocks.limit(...a);
        return chain;
      };
      chain.then = (res: (v: unknown) => unknown) =>
        res({ data: [{ id: "c1", ma_ca: "M1", khoa_ghi_nhan_id: "k1" }], error: null });
      return chain;
    },
  }),
}));

import { fetchCssdRcaBundle, fetchNkbvCasesLinkedToCssd } from "./nkbv-cssd-rca.actions";

const LO = "11111111-1111-1111-1111-111111111111";

describe("NKBV-015 fetchNkbvCasesLinkedToCssd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.length = 0;
  });
  it("kind=khoa: lọc khoa_ghi_nhan_id trong query trước limit", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: "k1" });
    const r = await fetchNkbvCasesLinkedToCssd({ loTietKhuanId: LO });
    expect(r.success).toBe(true);
    expect(mocks.order.indexOf("eq:khoa_ghi_nhan_id")).toBeGreaterThan(-1);
    expect(mocks.order.indexOf("eq:khoa_ghi_nhan_id")).toBeLessThan(mocks.order.indexOf("limit"));
  });
  it("kind=none: rỗng, không truy vấn", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    const r = await fetchNkbvCasesLinkedToCssd({ loTietKhuanId: LO });
    expect(r).toEqual({ success: true, cases: [] });
    expect(mocks.limit).not.toHaveBeenCalled();
  });
});

describe("NKBV-014 fetchCssdRcaBundle", () => {
  it("đòi cả GIAM_SAT_NKBV view và CSSD_WORKFLOW view; thiếu quyền CSSD thì chặn", async () => {
    perm.verifyPermissions.mockRejectedValueOnce(new Error("Bạn không có quyền [view] trên module [CSSD_WORKFLOW]."));
    const r = await fetchCssdRcaBundle({ quyTrinhId: LO });
    expect(r).toEqual({ success: false, error: "Bạn không có quyền [view] trên module [CSSD_WORKFLOW]." });
    expect(perm.verifyPermissions).toHaveBeenCalledWith([
      { moduleKey: "GIAM_SAT_NKBV", action: "view" },
      { moduleKey: "CSSD_WORKFLOW", action: "view" },
    ]);
  });
});
