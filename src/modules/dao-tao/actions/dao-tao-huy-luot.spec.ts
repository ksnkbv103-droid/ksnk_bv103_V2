import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; op: string; filters: Array<[string, unknown[]]>; payload?: unknown };

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  handler: vi.fn(),
  calls: [] as unknown[],
  audit: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: mocks.audit }));
vi.mock("@/modules/dao-tao/lib/dao-tao-auth", () => ({
  requireDaoTaoUser: async () => ({ user: { id: "admin-1", email: "a@b.vn" } }),
  requireDaoTaoAdmin: async () => ({ user: { id: "admin-1" } }),
}));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      const st: Call = { table, op: "select", filters: [] };
      mocks.calls.push(st);
      const b: Record<string, unknown> = {};
      const run = async () => mocks.handler(st);
      b.select = () => b;
      b.update = (p: unknown) => ((st.op = "update"), (st.payload = p), b);
      for (const m of ["eq", "lt", "in", "order", "limit"]) {
        b[m] = (...a: unknown[]) => (st.filters.push([m, a]), b);
      }
      b.maybeSingle = run;
      b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => run().then(res, rej);
      return b;
    },
  }),
}));

import { huyLanThiQuaHan } from "./dao-tao-admin.actions";

const ID = "9a1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f";
const row = (over: Record<string, unknown> = {}) => ({
  id: ID,
  auth_user_id: "u1",
  cau_hinh_id: "k1",
  trang_thai: "dang_lam",
  han_nop_luc: "2020-01-01T00:00:00Z",
  ...over,
});
const updates = () => (mocks.calls as Call[]).filter((c) => c.op === "update");

describe("huyLanThiQuaHan (DT-006)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calls.length = 0;
    mocks.verifyPermission.mockResolvedValue(undefined);
  });

  it("thiếu quyền edit: từ chối, không đọc DB", async () => {
    mocks.verifyPermission.mockRejectedValue(new Error("Bạn không có quyền [edit] trên module [DAO_TAO]."));
    await expect(huyLanThiQuaHan({ lanThiId: ID, lyDo: "x" })).rejects.toThrow("quyền [edit]");
    expect(mocks.verifyPermission).toHaveBeenCalledWith("DAO_TAO", "edit");
    expect(mocks.calls).toHaveLength(0);
  });

  it("lý do trống: từ chối", async () => {
    await expect(huyLanThiQuaHan({ lanThiId: ID, lyDo: "   " })).rejects.toThrow("lý do");
    expect(updates()).toHaveLength(0);
  });

  it("chưa quá hạn: từ chối", async () => {
    mocks.handler.mockResolvedValue({ data: row({ han_nop_luc: "2999-01-01T00:00:00Z" }), error: null });
    await expect(huyLanThiQuaHan({ lanThiId: ID, lyDo: "mất mạng" })).rejects.toThrow("chưa quá hạn");
    expect(updates()).toHaveLength(0);
  });

  it("không còn dang_lam: từ chối", async () => {
    mocks.handler.mockResolvedValue({ data: row({ trang_thai: "da_nop" }), error: null });
    await expect(huyLanThiQuaHan({ lanThiId: ID, lyDo: "mất mạng" })).rejects.toThrow("không còn ở trạng thái đang làm");
    expect(updates()).toHaveLength(0);
  });

  it("update 0 dòng (đua với người nộp): báo lỗi, không ghi audit", async () => {
    mocks.handler.mockImplementation(async (s: Call) =>
      s.op === "select" ? { data: row(), error: null } : { data: [], error: null },
    );
    await expect(huyLanThiQuaHan({ lanThiId: ID, lyDo: "mất mạng" })).rejects.toThrow("vừa đổi trạng thái");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("thành công: ghi đủ cột, update có điều kiện, ghi audit", async () => {
    mocks.handler.mockImplementation(async (s: Call) =>
      s.op === "select" ? { data: row(), error: null } : { data: [{ id: ID }], error: null },
    );
    expect(await huyLanThiQuaHan({ lanThiId: ID, lyDo: "  mất mạng  " })).toEqual({ ok: true });
    const u = updates()[0];
    expect(u.payload).toMatchObject({ trang_thai: "huy", huy_boi: "admin-1", ly_do_huy: "mất mạng" });
    const p = u.payload as Record<string, string>;
    expect(p.huy_luc).toBeTruthy();
    expect(p.updated_at).toBe(p.huy_luc);
    expect(u.filters).toContainEqual(["eq", ["trang_thai", "dang_lam"]]);
    expect(u.filters.some(([m, a]) => m === "lt" && a[0] === "han_nop_luc")).toBe(true);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DAO_TAO_HUY_LAN_THI", targetId: ID, actorUserId: "admin-1", reason: "mất mạng" }),
    );
  });
});
