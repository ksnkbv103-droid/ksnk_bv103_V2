import { describe, expect, it } from "vitest";
import {
  nkbvBaNgayDungCuSchema,
  nkbvBaNgayKhoaSchema,
  nkbvBaTimelineDeleteByKeySchema,
  nkbvThamDinhSchema,
} from "./giam-sat-nkbv.validations";

describe("zod ranh giới action NKBV", () => {
  it("lưới khoa: cắt ngày ISO về YYYY-MM-DD, khoa rỗng thành chuỗi rỗng", () => {
    const r = nkbvBaNgayKhoaSchema.parse({ ma_benh_an: " BA1 ", ngay_lich: "2026-10-01T00:00:00Z", khoa_id: null });
    expect(r).toEqual({ ma_benh_an: "BA1", ngay_lich: "2026-10-01", khoa_id: "" });
  });
  it("lưới khoa: ngày sai báo đúng thông báo cũ", () => {
    const r = nkbvBaNgayKhoaSchema.safeParse({ ma_benh_an: "BA1", ngay_lich: "01/10/2026", khoa_id: "k" });
    expect(!r.success && r.error.issues[0].message).toBe("Ngày không hợp lệ");
  });
  it("dụng cụ: thiếu cờ on bị chặn", () => {
    expect(nkbvBaNgayDungCuSchema.safeParse({ ma_benh_an: "BA1", ngay_lich: "2026-10-01", criteria_key: "x" }).success).toBe(false);
  });
  it("xóa theo khóa: thiếu criteria_key bị chặn", () => {
    const r = nkbvBaTimelineDeleteByKeySchema.safeParse({ ma_benh_an: "BA1", milestone_date: "2026-10-01", criteria_key: " " });
    expect(!r.success && r.error.issues[0].message).toBe("Thiếu khóa xóa mốc timeline");
  });
  it("thẩm định: id không phải uuid hoặc quyết định lạ bị chặn", () => {
    expect(nkbvThamDinhSchema.safeParse({ id: "abc", decision: "APPROVE" }).success).toBe(false);
    expect(nkbvThamDinhSchema.safeParse({ id: "0b1c7f4e-1f0e-4c1a-9a53-0d8f0c1b2a3d", decision: "DELETE" }).success).toBe(false);
    expect(nkbvThamDinhSchema.safeParse({ id: "0b1c7f4e-1f0e-4c1a-9a53-0d8f0c1b2a3d", decision: "EXCLUDE" }).success).toBe(true);
  });
});
