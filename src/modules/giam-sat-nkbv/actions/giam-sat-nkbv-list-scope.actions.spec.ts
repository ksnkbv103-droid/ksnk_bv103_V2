import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ restriction: vi.fn(), eq: vi.fn() }));

vi.mock("@/lib/server-permission", () => ({ verifyAnyPermission: vi.fn(async () => {}) }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({ getNkbvKhoaRestriction: mocks.restriction }));
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: async () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.is = () => chain;
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.eq = (...a: unknown[]) => {
        mocks.eq(...a);
        return chain;
      };
      chain.then = (res: (v: unknown) => void) => res({ data: [], error: null });
      return chain;
    },
  }),
}));

import { listMdroInpatientsByKhoa } from "./giam-sat-nkbv-mdro.actions";
import { listNkbvPatientRcaByKhoa } from "./giam-sat-nkbv-rca.actions";

const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const khoaEqs = () => mocks.eq.mock.calls.filter((c) => c[0] === "khoa_dieu_tri_id").map((c) => c[1]);

beforeEach(() => vi.clearAllMocks());

describe("NK-SCOPE danh sách MDRO / RCA theo khoa", () => {
  it("kind=khoa: ép khoaId theo quyền, bỏ qua client", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    await listMdroInpatientsByKhoa({ khoaId: K2 });
    await listMdroInpatientsByKhoa({ khoaId: "" });
    await listNkbvPatientRcaByKhoa({ khoaId: K2 });
    expect(khoaEqs()).toEqual([K1, K1, K1]);
  });

  it("kind=none: trả mảng rỗng, không truy vấn", async () => {
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toEqual({ success: true, data: [] });
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toEqual({ success: true, data: [] });
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it("kind=all: giữ hành vi cũ", async () => {
    mocks.restriction.mockResolvedValue({ kind: "all" });
    await listMdroInpatientsByKhoa({ khoaId: K2 });
    await listMdroInpatientsByKhoa({});
    await listNkbvPatientRcaByKhoa({ khoaId: K2 });
    expect(khoaEqs()).toEqual([K2, K2]);
  });
});
