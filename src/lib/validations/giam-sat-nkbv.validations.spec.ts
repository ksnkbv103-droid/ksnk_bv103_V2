import { describe, expect, it } from "vitest";
import {
  giamSatNkbvCaSchema,
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

/**
 * NEN-016 lát C: `khoa_ghi_nhan_id` (khoa) và `nguoi_ghi_id` (nhân sự) dùng `z.guid()`; Zod 4 `.uuid()` kiểm RFC
 * nên từ chối id seed `aaaaaaaa-bbbb-cccc-dddd-000000000001` trong khi cột Postgres `uuid` chấp nhận.
 */
describe("giamSatNkbvCaSchema — id khoa/nhân sự (NEN-016 C)", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const JUNK = "khong-phai-uuid";
  const base = {
    ma_ca: "CA1",
    khoa_ghi_nhan_id: V4,
    ho_ten_benh_nhan: "Nguyễn Văn A",
    loai_nkbv_id: V4,
    trang_thai_id: V4,
  };
  const FIELDS = [
    ["khoa_ghi_nhan_id", "Khoa ghi nhận không hợp lệ"],
    ["nguoi_ghi_id", "Người ghi không hợp lệ"],
  ] as const;

  it.each(FIELDS)("%s nhận id seed không chuẩn RFC và UUID v4", (field) => {
    expect(giamSatNkbvCaSchema.safeParse({ ...base, [field]: SEED }).success).toBe(true);
    expect(giamSatNkbvCaSchema.safeParse({ ...base, [field]: V4 }).success).toBe(true);
  });

  it("nguoi_ghi_id vẫn cho null và bỏ trống", () => {
    expect(giamSatNkbvCaSchema.safeParse({ ...base, nguoi_ghi_id: null }).success).toBe(true);
    expect(giamSatNkbvCaSchema.safeParse(base).success).toBe(true);
  });

  it.each(FIELDS)("%s vẫn từ chối chuỗi rác, giữ câu lỗi cũ", (field, message) => {
    const r = giamSatNkbvCaSchema.safeParse({ ...base, [field]: JUNK });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.find((i) => i.path[0] === field)?.message).toBe(message);
  });
});
