import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  verifyPermissions: vi.fn(),
  from: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/server-permission", () => ({
  verifyPermission: mocks.verifyPermission,
  verifyPermissions: mocks.verifyPermissions,
}));
vi.mock("@/lib/actor-auth-server", () => ({ getActorNhanSuId: async () => null }));
vi.mock("@/lib/supabase-server", () => ({
  createAdminSupabaseClient: () => ({ from: mocks.from }),
}));

import {
  getNgayGiuongList,
  getSoCanHistory,
  getSoCanNgay,
  getSuCoList,
  getThongKeKyAction,
  listKhoaPhongDropdown,
  saveNgayGiuong,
  saveSoCanNgay,
  saveSuCo,
} from "./chat-thai-do-vai.actions";

const DENIED = "Bạn không có quyền [view] trên module [HAU_CAN_MOI_TRUONG].";

function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "gte", "lte", "order", "update", "insert", "upsert"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return b;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyPermission.mockResolvedValue(undefined);
  mocks.verifyPermissions.mockResolvedValue(undefined);
  mocks.from.mockImplementation(() => chain({ data: [], error: null }));
});

describe("chat-thai-do-vai: thiếu quyền bị từ chối, không chạm DB", () => {
  beforeEach(() => {
    mocks.verifyPermission.mockRejectedValue(new Error(DENIED));
  });

  it("6 action đọc ném lỗi", async () => {
    await expect(getSoCanNgay("2026-11-05")).rejects.toThrow(DENIED);
    await expect(getSoCanHistory("2026-11-01", "2026-11-05")).rejects.toThrow(DENIED);
    await expect(getSuCoList("2026-11-01", "2026-11-05")).rejects.toThrow(DENIED);
    await expect(getNgayGiuongList(2026)).rejects.toThrow(DENIED);
    await expect(listKhoaPhongDropdown()).rejects.toThrow(DENIED);
    await expect(getThongKeKyAction("2026-11-01", "2026-11-05")).rejects.toThrow(DENIED);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("action ghi trả success=false", async () => {
    expect((await saveSoCanNgay("2026-11-05", {})).success).toBe(false);
    expect(
      (await saveSuCo({ ngay_ghi_nhan: "2026-11-05", phan_he: "DO_VAI", loai_su_co: "KHAC" })).success,
    ).toBe(false);
    expect((await saveNgayGiuong(2026, 11, 100)).success).toBe(false);
  });
});

describe("chat-thai-do-vai: zod chặn input sai", () => {
  it("ngày sai định dạng / khoảng ngược bị chặn", async () => {
    await expect(getSoCanNgay("05/11/2026")).rejects.toThrow();
    await expect(getSoCanHistory("2026-11-05", "2026-11-01")).rejects.toThrow();
    await expect(getThongKeKyAction("2026-02-30", "2026-03-01")).rejects.toThrow();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("saveSoCanNgay: ngày sai, loại mục lạ, số âm tui", async () => {
    expect((await saveSoCanNgay("x", {})).success).toBe(false);
    const bad = { KHONG_CO: { khoi_luong_kg: 1 } } as never;
    expect((await saveSoCanNgay("2026-11-05", bad)).success).toBe(false);
    const neg = { CT_THONG_THUONG: { khoi_luong_kg: 1, so_tui: -1 } };
    expect((await saveSoCanNgay("2026-11-05", neg)).success).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("saveSuCo: id không phải uuid, enum sai", async () => {
    const base = { ngay_ghi_nhan: "2026-11-05", phan_he: "DO_VAI", loai_su_co: "KHAC" } as const;
    expect((await saveSuCo({ ...base, id: "abc" })).success).toBe(false);
    expect((await saveSuCo({ ...base, phan_he: "XX" as never })).success).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("saveNgayGiuong: tháng 13 bị chặn", async () => {
    expect((await saveNgayGiuong(2026, 13, 10)).success).toBe(false);
  });
});

describe("chat-thai-do-vai: quyền theo thao tác", () => {
  it("saveSuCo: có id -> edit, không id -> create", async () => {
    const base = { ngay_ghi_nhan: "2026-11-05", phan_he: "DO_VAI", loai_su_co: "KHAC" } as const;
    await saveSuCo(base);
    expect(mocks.verifyPermission).toHaveBeenLastCalledWith("HAU_CAN_MOI_TRUONG", "create");
    await saveSuCo({ ...base, id: "3f1c2b4a-9d8e-4f7a-8b6c-1a2b3c4d5e6f" });
    expect(mocks.verifyPermission).toHaveBeenLastCalledWith("HAU_CAN_MOI_TRUONG", "edit");
  });

  it("saveSoCanNgay: bản ghi đã có -> đòi quyền edit; chưa có -> create", async () => {
    const entries = { CT_THONG_THUONG: { khoi_luong_kg: 5 } };
    mocks.from.mockImplementationOnce(() =>
      chain({ data: [{ loai_muc: "CT_THONG_THUONG" }], error: null }),
    );
    await saveSoCanNgay("2026-11-05", entries);
    expect(mocks.verifyPermissions).toHaveBeenLastCalledWith([
      { moduleKey: "HAU_CAN_MOI_TRUONG", action: "edit" },
    ]);
    await saveSoCanNgay("2026-11-05", entries);
    expect(mocks.verifyPermissions).toHaveBeenLastCalledWith([
      { moduleKey: "HAU_CAN_MOI_TRUONG", action: "create" },
    ]);
  });
});
