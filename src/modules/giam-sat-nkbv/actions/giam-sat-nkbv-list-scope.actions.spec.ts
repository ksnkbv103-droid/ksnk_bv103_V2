import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ restriction: vi.fn(), viaGsc: { v: false }, admin: vi.fn(), eq: vi.fn() }));

vi.mock("@/lib/server-permission", () => ({ verifyAnyPermission: vi.fn(async () => {}) }));
vi.mock("../lib/nkbv-khoa-scope.server", () => ({
  getNkbvCensusAccess: async () => ({ restriction: await mocks.restriction(), viaGscOnly: mocks.viaGsc.v }),
  NKBV_GSC_NO_KHOA_ERROR: "NO_KHOA",
}));
const makeClient = (tag: string) => ({
    from: () => {
      mocks.admin(tag);
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
});
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseUserClient: async () => makeClient("user"),
  createAdminSupabaseClient: () => makeClient("admin"),
}));

import { listMdroInpatientsByKhoa } from "./giam-sat-nkbv-mdro.actions";
import { listNkbvPatientRcaByKhoa } from "./giam-sat-nkbv-rca.actions";

const K1 = "11111111-1111-4111-8111-111111111111";
const K2 = "22222222-2222-4222-8222-222222222222";
const khoaEqs = () => mocks.eq.mock.calls.filter((c) => c[0] === "khoa_dieu_tri_id").map((c) => c[1]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.viaGsc.v = false;
});

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

  it("NKBV-005 GSC-only trong khoa: đọc bằng admin client, ép khoa của mình", async () => {
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    await listMdroInpatientsByKhoa({ khoaId: K2 });
    await listNkbvPatientRcaByKhoa({ khoaId: K2 });
    expect(khoaEqs()).toEqual([K1, K1]);
    expect(new Set(mocks.admin.mock.calls.map((c) => c[0]))).toEqual(new Set(["admin"]));
  });

  it("NKBV-005 GSC-only không xác định được khoa: trả lỗi rõ, không rỗng-success", async () => {
    mocks.viaGsc.v = true;
    mocks.restriction.mockResolvedValue({ kind: "none" });
    expect(await listMdroInpatientsByKhoa({ khoaId: K2 })).toMatchObject({ success: false, error: "NO_KHOA" });
    expect(await listNkbvPatientRcaByKhoa({ khoaId: K2 })).toMatchObject({ success: false, error: "NO_KHOA" });
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it("NKBV-005 có quyền NKBV: vẫn dùng user client (RLS)", async () => {
    mocks.restriction.mockResolvedValue({ kind: "khoa", khoaId: K1 });
    await listMdroInpatientsByKhoa({});
    expect(new Set(mocks.admin.mock.calls.map((c) => c[0]))).toEqual(new Set(["user"]));
  });
});
