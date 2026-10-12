import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * ACC-1: form công khai chỉ ghi phiếu `sys_account_access_request`, không bao giờ ghi `mdm_nhan_su`;
 * quên mật khẩu với email không khớp hồ sơ → không tạo phiếu, cùng một thông điệp.
 */
type Call = { table: string; ops: string[]; args: unknown[][] };
type Result = { data?: unknown; error?: unknown; count?: number };

const state = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; ops: string[]; args: unknown[][] }>,
  resolve: (() => ({ data: null })) as (c: { table: string; ops: string[]; args: unknown[][] }) => {
    data?: unknown;
    error?: unknown;
    count?: number;
  },
}));

function makeClient() {
  return {
    from(table: string) {
      const call: Call = { table, ops: [], args: [] };
      state.calls.push(call);
      const builder: Record<string, unknown> = {};
      const chain = (op: string) => (...args: unknown[]) => {
        call.ops.push(op);
        call.args.push(args);
        return builder;
      };
      for (const op of ["select", "eq", "ilike", "gte", "limit", "order", "range", "in", "or", "is", "insert", "update", "delete"]) {
        builder[op] = chain(op);
      }
      const done = (): Promise<Result> => Promise.resolve({ error: null, ...state.resolve(call) });
      builder.maybeSingle = () => {
        call.ops.push("maybeSingle");
        return done();
      };
      builder.single = () => {
        call.ops.push("single");
        return done();
      };
      builder.then = (ok: (r: Result) => unknown, bad?: (e: unknown) => unknown) => done().then(ok, bad);
      return builder;
    },
  };
}

vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => makeClient(),
  createServerSupabaseUserClient: vi.fn(),
}));
vi.mock("@/lib/cache/master-data-cache", () => ({
  getCachedDmKhoaPhong: async () => [{ id: KHOA, ten_khoa: "Khoa A", ma_khoa: "A" }],
}));
vi.mock("@/modules/quan-tri-he-thong/actions/revalidate-quan-tri", () => ({ revalidateNhanSuTaiKhoan: vi.fn() }));

const KHOA = "11111111-1111-4111-8111-111111111111";
const CD = "22222222-2222-4222-8222-222222222222";
const STAFF = {
  id: "33333333-3333-4333-8333-333333333333",
  ma_nv: "NV001",
  auth_user_id: "44444444-4444-4444-8444-444444444444",
  is_active: true,
  email: "Real.User@bv103.vn",
};

import {
  submitAccountAccessRequestAction,
  submitForgotResetAdminRequestAction,
} from "./account-access-request-public.actions";

const writesTo = (table: string) =>
  state.calls.filter((c) => c.table === table && c.ops.some((o) => o === "insert" || o === "update" || o === "delete"));

function defaultResolve(staff: Record<string, unknown> | null) {
  return (c: Call): Result => {
    if (c.table === "sys_account_access_request") {
      if (c.ops.includes("insert")) return { data: { id: "ticket-1" } };
      if (c.ops[0] === "select" && c.ops.includes("limit") && c.ops.length === 2) return { data: [] }; // probe
      return { count: 0, data: [] };
    }
    if (c.table === "mdm_dm_chuc_danh") return { data: { id: CD, ten_chuc_danh: "Bác sĩ", is_active: true } };
    if (c.table === "v_mdm_nhan_su_full") {
      if (c.ops.includes("maybeSingle")) return { data: staff };
      return { data: staff ? [staff] : [] };
    }
    return { data: null };
  };
}

beforeEach(() => {
  state.calls = [];
  state.resolve = defaultResolve(STAFF);
});

describe("submitForgotResetAdminRequestAction", () => {
  const base = { ma_nv: "NV001", ly_do: "Quên mật khẩu đăng nhập" };

  it("email không khớp hồ sơ → không tạo phiếu, không ghi hồ sơ", async () => {
    const res = await submitForgotResetAdminRequestAction({ ...base, email: "attacker@evil.test" });
    expect(res.success).toBe(true);
    expect(writesTo("sys_account_access_request")).toHaveLength(0);
    expect(writesTo("mdm_nhan_su")).toHaveLength(0);
  });

  it("email khớp (khác hoa thường) → chỉ tạo phiếu RESET, không ghi hồ sơ", async () => {
    const res = await submitForgotResetAdminRequestAction({ ...base, email: "  real.user@BV103.vn " });
    expect(res.success).toBe(true);
    const ins = writesTo("sys_account_access_request");
    expect(ins).toHaveLength(1);
    expect(ins[0].args[ins[0].ops.indexOf("insert")][0]).toMatchObject({
      kind: "RESET",
      email: "real.user@bv103.vn",
      staff_id: STAFF.id,
    });
    expect(writesTo("mdm_nhan_su")).toHaveLength(0);
  });

  it("thông điệp giống hệt nhau dù khớp, không khớp hay không có hồ sơ", async () => {
    const miss = await submitForgotResetAdminRequestAction({ ...base, email: "attacker@evil.test" });
    const hit = await submitForgotResetAdminRequestAction({ ...base, email: "real.user@bv103.vn" });
    state.resolve = defaultResolve(null);
    const none = await submitForgotResetAdminRequestAction({ ...base, ma_nv: "KHONGCO", email: "x@y.vn" });
    expect(miss).toEqual(hit);
    expect(none).toEqual(hit);
  });
});

describe("submitAccountAccessRequestAction", () => {
  const input = {
    ho_ten: "Nguyễn Văn A",
    email: "new.user@bv103.vn",
    khoa_id: KHOA,
    chuc_danh_id: CD,
    ma_nv: "NV001",
    ly_do: "Xin cấp tài khoản mới",
  };

  it("hồ sơ thật chưa có TK → chỉ tạo phiếu, không update/insert mdm_nhan_su", async () => {
    state.resolve = defaultResolve({ ...STAFF, auth_user_id: null });
    const res = await submitAccountAccessRequestAction(input);
    expect(res.success).toBe(true);
    expect(writesTo("sys_account_access_request")).toHaveLength(1);
    expect(writesTo("mdm_nhan_su")).toHaveLength(0);
  });

  it("không có hồ sơ → chỉ tạo phiếu (payload đề xuất), không chèn hồ sơ mới", async () => {
    state.resolve = defaultResolve(null);
    const res = await submitAccountAccessRequestAction(input);
    expect(res.success).toBe(true);
    const ins = writesTo("sys_account_access_request");
    expect(ins).toHaveLength(1);
    expect(ins[0].args[ins[0].ops.indexOf("insert")][0]).toMatchObject({
      kind: "REQUEST",
      staff_id: null,
      payload: { ho_ten: "Nguyễn Văn A", khoa_id: KHOA, chuc_danh_id: CD },
    });
    expect(writesTo("mdm_nhan_su")).toHaveLength(0);
  });

  it("đã có phiếu chờ theo mã NV ≥ trần → không tạo thêm phiếu", async () => {
    const inner = defaultResolve(null);
    state.resolve = (c) =>
      c.table === "sys_account_access_request" && c.ops.includes("ilike") && !c.ops.includes("gte")
        ? { count: 5 }
        : inner(c);
    const res = await submitAccountAccessRequestAction(input);
    expect(res.success).toBe(true);
    expect(writesTo("sys_account_access_request")).toHaveLength(0);
  });
});
