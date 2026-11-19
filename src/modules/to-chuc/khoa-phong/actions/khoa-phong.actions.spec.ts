/**
 * QT-018 — saveKhoaPhongAction kiểm hình dạng đầu vào bằng zod trước khi chạm DB.
 * Trước đây `input: Record<string, unknown>` được ép `String(...)` nên object/mảng lọt thành chuỗi rác.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyPermission: vi.fn(),
  upsertMasterRow: vi.fn(),
  normalizeKhoi: vi.fn(),
}));

vi.mock("@/lib/server-permission", () => ({ verifyPermission: mocks.verifyPermission }));
vi.mock("@/lib/supabase-server", () => ({ createAdminSupabaseClient: () => ({}) }));
vi.mock("@/lib/master-data/fk-normalize", () => ({
  normalizeDanhMucNullableByLoai: mocks.normalizeKhoi,
}));
vi.mock("@/lib/master-data/engine/master-crud-core", () => ({
  upsertMasterRow: mocks.upsertMasterRow,
  softDeleteManyMasterRows: vi.fn(),
  softDeleteMasterRow: vi.fn(),
  toggleMasterStatus: vi.fn(),
}));

import { saveKhoaPhongAction } from "@/modules/to-chuc/khoa-phong/actions/khoa-phong.actions";

const KHOA_ID = "11111111-1111-4111-8111-111111111111";

const hopLe = {
  id: "",
  ma_danh_muc: "icu",
  ten_danh_muc: "Hồi sức tích cực",
  khoi_id: "",
  mo_ta_chuc_nang: "",
  so_bac_si: 3,
  so_dieu_duong: 12,
  so_giuong_benh_thuong: 20,
  so_giuong_cap_cuu: 4,
  is_active: true,
  specs: { allowed_khu_vucs: [] },
  cdc_location_code: "IN:ICU",
};

describe("saveKhoaPhongAction — zod đầu vào (QT-018)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyPermission.mockResolvedValue(undefined);
    mocks.normalizeKhoi.mockResolvedValue(null);
    mocks.upsertMasterRow.mockResolvedValue({ success: true });
  });

  it("từ chối specs là chuỗi (trước đây bị trải thành {0:'a',…})", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, specs: "abc" });
    expect(res.success).toBe(false);
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("từ chối specs là mảng", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, specs: ["x"] });
    expect(res.success).toBe(false);
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("từ chối id không phải UUID", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, id: "abc" });
    expect(res.success).toBe(false);
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("từ chối tên là object (trước đây thành «[object Object]»)", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, ten_danh_muc: { a: 1 } });
    expect(res.success).toBe(false);
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("từ chối mã khoa dài hơn 50 ký tự (cột varchar(50))", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, ma_danh_muc: "A".repeat(51) });
    expect(res.success).toBe(false);
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("thiếu mã hoặc tên vẫn báo đúng thông điệp cũ", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, ma_danh_muc: "   " });
    expect(res).toEqual({ success: false, error: "Thiếu mã hoặc tên khoa phòng." });
    expect(mocks.upsertMasterRow).not.toHaveBeenCalled();
  });

  it("đầu vào hợp lệ: ghi một lần, mã viết hoa, số âm về 0", async () => {
    const res = await saveKhoaPhongAction({ ...hopLe, id: KHOA_ID, so_bac_si: -5 });
    expect(res.success).toBe(true);
    expect(mocks.verifyPermission).toHaveBeenCalledWith("KHOA_PHONG", "edit");
    expect(mocks.upsertMasterRow).toHaveBeenCalledTimes(1);
    const [table, id, payload] = mocks.upsertMasterRow.mock.calls[0];
    expect(table).toBe("mdm_dm_khoa_phong");
    expect(id).toBe(KHOA_ID);
    expect(payload.ma_khoa).toBe("ICU");
    expect(payload.ten_khoa).toBe("Hồi sức tích cực");
    expect(payload.specs.so_bac_si).toBe(0);
    expect(payload.specs.so_dieu_duong).toBe(12);
    expect(payload.specs.cdc_location_code).toBe("IN:ICU");
  });

  it("tạo mới (id rỗng) cần quyền create", async () => {
    await saveKhoaPhongAction(hopLe);
    expect(mocks.verifyPermission).toHaveBeenCalledWith("KHOA_PHONG", "create");
  });
});
