import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ restriction: vi.fn(), eq: vi.fn(), from: vi.fn() }));

vi.mock("@/lib/server-permission", () => ({
  verifyPermission: vi.fn(async () => {}),
  verifyAnyPermission: vi.fn(async () => {}),
}));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvKhoaRestriction: mocks.restriction,
  isNkbvBenhAnInScope: vi.fn(),
  NKBV_OUT_OF_SCOPE_ERROR: "x",
}));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: vi.fn(),
  createAdminSupabaseClient: () => ({
    from: (t: string) => {
      mocks.from(t);
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.limit = () => chain;
      chain.eq = (...a: unknown[]) => {
        mocks.eq(...a);
        return chain;
      };
      chain.then = (res: (v: unknown) => void) => res({ data: [{ ma_ca: "NK001" }], error: null });
      return chain;
    },
  }),
}));

import { listAllMaNkbvCas } from "./giam-sat-nkbv-read.actions";

const K1 = "11111111-1111-4111-8111-111111111111";
beforeEach(() => vi.clearAllMocks());

describe("NKBV-012 listAllMaNkbvCas theo khoa", () => {
  it("kind=khoa: lọc khoa_ghi_nhan_id của mình", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    const r = await listAllMaNkbvCas();
    expect(r).toEqual({ success: true, data: [{ ma_ca: "NK001" }] });
    expect(mocks.eq).toHaveBeenCalledWith("khoa_ghi_nhan_id", K1);
  });

  it("kind=none: rỗng, không truy vấn (ngoài phạm vi)", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listAllMaNkbvCas()).toEqual({ success: true, data: [] });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("kind=all: không lọc khoa", async () => {
    mocks.restriction.mockResolvedValue({ kind: "all" });
    const r = await listAllMaNkbvCas();
    expect(r.success).toBe(true);
    expect(mocks.eq.mock.calls.some((c) => c[0] === "khoa_ghi_nhan_id")).toBe(false);
  });
});
