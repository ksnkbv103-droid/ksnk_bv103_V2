import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * VST-037: lập/bỏ kế hoạch giám sát khoa/tháng phải ghi nhật ký quản trị (logAdminAction) ở cả hai nhánh,
 * và chỉ ghi khi dữ liệu thật sự đổi (đã có sẵn / đua ghi 23505 thì không ghi).
 * @dac-ta: khóa PO 2026-11-01 (kế hoạch giám sát khoa/tháng); CLAUDE.md §Khóa PO.
 */
const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  getActorKsnkScope: vi.fn(),
  logAdminAction: vi.fn(),
  existing: null as { id: string } | null,
  insertResult: { error: null } as { error: { code?: string; message: string } | null },
  updateResult: { data: [{ id: "kh-1" }], error: null } as {
    data?: { id: string }[];
    error: { code?: string; message: string } | null;
  },
  insert: vi.fn(),
  update: vi.fn(),
}));

type Chain = {
  eq: () => Chain;
  select: () => Chain;
  maybeSingle: () => Promise<unknown>;
  then: (r: (v: unknown) => unknown) => unknown;
};
function chain(result: () => unknown): Chain {
  const c: Chain = {
    eq: () => c,
    select: () => c,
    maybeSingle: async () => result(),
    then: (r) => r(result()),
  };
  return c;
}

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/actor-ksnk-scope-server", () => ({ getActorKsnkScope: mocks.getActorKsnkScope }));
vi.mock("@/lib/admin-audit", () => ({ logAdminAction: mocks.logAdminAction }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => chain(() => ({ data: mocks.existing, error: null })),
      insert: async (row: unknown) => {
        mocks.insert(row);
        return mocks.insertResult;
      },
      update: (patch: unknown) => {
        mocks.update(patch);
        return chain(() => mocks.updateResult);
      },
    }),
  }),
}));

import { setKeHoachKhoa } from "./ke-hoach-giam-sat.actions";

const KHOA = "33333333-3333-4333-8333-333333333333";
const input = { thang: "2026-11-01", loai: "VST" as const, khoaId: KHOA, active: true };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyPermission.mockResolvedValue(undefined);
  mocks.getActorKsnkScope.mockResolvedValue({ isAdmin: false, isNhanVienKsnk: true, actorNhanSuId: "ns-1" });
  mocks.existing = null;
  mocks.insertResult = { error: null };
  mocks.updateResult = { data: [{ id: "kh-1" }], error: null };
});

describe("setKeHoachKhoa — nhật ký quản trị (VST-037)", () => {
  it("lập mới: ghi nhật ký một lần, có khoa/tháng/loại", async () => {
    const r = await setKeHoachKhoa(input);
    expect(r).toEqual({ success: true });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.logAdminAction).toHaveBeenCalledTimes(1);
    expect(mocks.logAdminAction.mock.calls[0][0]).toMatchObject({
      targetTable: "gstt_fact_ke_hoach_giam_sat",
      after: { khoa_id: KHOA, thang: "2026-11-01", loai: "VST", is_active: true },
    });
  });

  it("bỏ kế hoạch (xóa mềm): ghi nhật ký với is_active=false", async () => {
    const r = await setKeHoachKhoa({ ...input, active: false });
    expect(r).toEqual({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({ is_active: false });
    expect(mocks.logAdminAction).toHaveBeenCalledTimes(1);
    expect(mocks.logAdminAction.mock.calls[0][0]).toMatchObject({
      targetTable: "gstt_fact_ke_hoach_giam_sat",
      after: { khoa_id: KHOA, is_active: false },
    });
  });

  it("bỏ kế hoạch chưa từng lập (UPDATE khớp 0 dòng): thành công, không nhật ký", async () => {
    mocks.updateResult = { data: [], error: null };
    expect(await setKeHoachKhoa({ ...input, active: false })).toEqual({ success: true });
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });

  it("đã có kế hoạch hiệu lực: không ghi, không nhật ký", async () => {
    mocks.existing = { id: "kh-1" };
    expect(await setKeHoachKhoa(input)).toEqual({ success: true });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });

  it("đua ghi (23505): coi như thành công, không nhật ký", async () => {
    mocks.insertResult = { error: { code: "23505", message: "duplicate" } };
    expect(await setKeHoachKhoa(input)).toEqual({ success: true });
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });

  it("ghi lỗi: trả lỗi chung, không nhật ký", async () => {
    mocks.insertResult = { error: { code: "XX000", message: "boom" } };
    const r = await setKeHoachKhoa(input);
    expect(r.success).toBe(false);
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });

  it("không phải admin/NV KSNK: chặn, không ghi, không nhật ký", async () => {
    mocks.getActorKsnkScope.mockResolvedValue({ isAdmin: false, isNhanVienKsnk: false, actorNhanSuId: "ns-2" });
    const r = await setKeHoachKhoa(input);
    expect(r.success).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.logAdminAction).not.toHaveBeenCalled();
  });
});

/**
 * NEN-016 lát A: `writeSchema.khoaId` dùng `z.string().uuid()`; Zod 4 kiểm RFC (nibble phiên bản 1–8) nên từ chối id khoa seed
 * `aaaaaaaa-bbbb-cccc-dddd-000000000001` (id thật của khoa KSNK trên DB local; cột Postgres `uuid` chấp nhận mọi dạng 8-4-4-4-12 hex).
 */
describe("setKeHoachKhoa — parse khoaId (NEN-016)", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";

  it("nhận id khoa seed không chuẩn RFC (tới bước ghi)", async () => {
    expect(await setKeHoachKhoa({ ...input, khoaId: SEED })).toEqual({ success: true });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ khoa_id: SEED }));
  });

  it("nhận id UUID v4 chuẩn", async () => {
    expect(await setKeHoachKhoa({ ...input, khoaId: "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34" })).toEqual({ success: true });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it("vẫn từ chối chuỗi không phải UUID (không tới bước kiểm quyền)", async () => {
    expect(await setKeHoachKhoa({ ...input, khoaId: "khong-phai-uuid" })).toEqual({
      success: false,
      error: "Tham số không hợp lệ",
    });
    expect(mocks.verifyPermission).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
