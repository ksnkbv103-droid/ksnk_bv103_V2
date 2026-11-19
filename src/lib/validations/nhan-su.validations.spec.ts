import { describe, expect, it } from "vitest";
import { nhanSuSchema } from "./nhan-su.validations";

/**
 * NEN-016 lát B1: Zod 4 `z.string().uuid()` kiểm RFC (nibble phiên bản 1–8) nên từ chối id khoa seed
 * `aaaaaaaa-bbbb-cccc-dddd-000000000001`; cột Postgres `uuid` chấp nhận mọi dạng 8-4-4-4-12 hex.
 * `khoa_id` của hồ sơ nhân sự dùng `z.guid()`; chuỗi rác vẫn bị từ chối với câu lỗi cũ.
 */
const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
const JUNK = "khong-phai-uuid";

const parse = (khoa_id: unknown) => nhanSuSchema.safeParse({ ho_ten: "Nguyễn Văn A", khoa_id });

describe("nhanSuSchema — khoa_id (NEN-016)", () => {
  it("nhận id khoa seed không chuẩn RFC", () => {
    expect(parse(SEED).success).toBe(true);
  });

  it("nhận UUID v4 chuẩn; vẫn cho null/bỏ trống", () => {
    expect(parse(V4).success).toBe(true);
    expect(parse(null).success).toBe(true);
    expect(nhanSuSchema.safeParse({ ho_ten: "Nguyễn Văn A" }).success).toBe(true);
  });

  it("vẫn từ chối chuỗi không phải UUID, giữ câu lỗi cũ", () => {
    const parsed = parse(JUNK);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join(".") === "khoa_id");
      expect(issue?.message).toBe("Khoa không hợp lệ");
    }
  });
});
