import { describe, expect, it } from "vitest";
import { GUEST_STATS_PILOT_EMAIL } from "@/lib/auth/guest-stats-pilot";
import {
  approveAccountAccessRequestSchema,
  rejectAccountAccessRequestSchema,
  submitAccountAccessRequestSchema,
  submitForgotResetAdminRequestSchema,
} from "./account-access-request.validations";
import {
  adminResetStaffPasswordSchema,
  parseOrFirstError,
  provisionStaffAuthAccountSchema,
  setStaffKsnkRbacRoleSchema,
  setupGuestStatsPilotAccountSchema,
  staffIdSchema,
} from "./tai-khoan-nhan-su.validations";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("tai-khoan-nhan-su.validations", () => {
  it("mật khẩu ngắn bị từ chối với câu lỗi cũ", () => {
    const r = parseOrFirstError(provisionStaffAuthAccountSchema, { staffId: UUID, password: "abc" });
    expect(r).toEqual({ ok: false, error: "Mật khẩu tối thiểu 8 ký tự." });
  });

  it("mật khẩu > 72 ký tự bị từ chối", () => {
    const r = parseOrFirstError(provisionStaffAuthAccountSchema, { staffId: UUID, password: "a".repeat(73) });
    expect(r.ok).toBe(false);
  });

  it("staffId không phải uuid bị từ chối", () => {
    const r = parseOrFirstError(provisionStaffAuthAccountSchema, { staffId: "1; drop", password: "12345678" });
    expect(r.ok).toBe(false);
  });

  it("gỡ vai trò (roleName rỗng) hợp lệ", () => {
    expect(parseOrFirstError(setStaffKsnkRbacRoleSchema, { staffId: UUID, roleName: "  " }).ok).toBe(true);
  });

  it("reset mật khẩu thiếu mật khẩu xác nhận bị từ chối", () => {
    const r = parseOrFirstError(adminResetStaffPasswordSchema, { staffId: UUID, password: "12345678" });
    expect(r.ok).toBe(false);
  });

  it("email khách pilot (không có tên miền chuẩn) vẫn qua", () => {
    const r = parseOrFirstError(setupGuestStatsPilotAccountSchema, {
      password: "12345678",
      email: GUEST_STATS_PILOT_EMAIL,
      confirmActorPassword: "x",
    });
    expect(r.ok).toBe(true);
  });

  it("tài khoản khách thiếu mật khẩu xác nhận bị từ chối", () => {
    const r = parseOrFirstError(setupGuestStatsPilotAccountSchema, { password: "12345678" });
    expect(r.ok).toBe(false);
  });
});

describe("account-access-request.validations", () => {
  const base = {
    ho_ten: "Nguyễn Văn A",
    email: "a@bv103.vn",
    khoa_id: UUID,
    chuc_danh_id: UUID,
    ly_do: "Cần tài khoản để giám sát",
  };

  it("hồ sơ hợp lệ được cắt khoảng trắng", () => {
    const r = parseOrFirstError(submitAccountAccessRequestSchema, { ...base, ho_ten: "  Nguyễn Văn A  " });
    expect(r.ok && r.data.ho_ten).toBe("Nguyễn Văn A");
  });

  it("thiếu khoa giữ câu lỗi cũ", () => {
    const r = parseOrFirstError(submitAccountAccessRequestSchema, { ...base, khoa_id: "" });
    expect(r).toEqual({ ok: false, error: "Chọn khoa / phòng từ danh mục." });
  });

  it("lý do ngắn giữ câu lỗi cũ", () => {
    const r = parseOrFirstError(submitAccountAccessRequestSchema, { ...base, ly_do: "ab" });
    expect(r).toEqual({ ok: false, error: "Lý do xin cấp tài khoản tối thiểu 5 ký tự." });
  });

  it("endpoint public chặn payload quá dài", () => {
    expect(parseOrFirstError(submitAccountAccessRequestSchema, { ...base, ly_do: "x".repeat(1001) }).ok).toBe(false);
    expect(parseOrFirstError(submitForgotResetAdminRequestSchema, { email: "a".repeat(300), ly_do: "hợp lệ ok" }).ok).toBe(false);
  });

  it("input không phải object không làm crash", () => {
    expect(parseOrFirstError(submitAccountAccessRequestSchema, null).ok).toBe(false);
    expect(parseOrFirstError(submitAccountAccessRequestSchema, undefined).ok).toBe(false);
  });

  it("duyệt/từ chối kiểm staffId và độ dài lý do", () => {
    expect(parseOrFirstError(approveAccountAccessRequestSchema, { staffId: "x", password: "12345678", confirmActorPassword: "p" }).ok).toBe(false);
    expect(parseOrFirstError(rejectAccountAccessRequestSchema, { staffId: UUID, reason: "ab" })).toEqual({
      ok: false,
      error: "Lý do từ chối tối thiểu 3 ký tự.",
    });
  });
});

/**
 * NEN-016 lát B1: `staffIdSchema` (có trim) và `khoa_id` của yêu cầu cấp tài khoản dùng `z.guid()`;
 * Zod 4 `.uuid()` từ chối id seed không chuẩn RFC trong khi cột Postgres `uuid` chấp nhận.
 */
describe("staffIdSchema — NEN-016", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";

  it("nhận id nhân sự seed không chuẩn RFC, vẫn cắt khoảng trắng hai đầu", () => {
    expect(staffIdSchema.safeParse(SEED)).toMatchObject({ success: true, data: SEED });
    expect(staffIdSchema.safeParse(`  ${SEED}  `)).toMatchObject({ success: true, data: SEED });
  });

  it("nhận UUID v4 chuẩn", () => {
    expect(staffIdSchema.safeParse(V4)).toMatchObject({ success: true, data: V4 });
  });

  it("vẫn từ chối chuỗi rác với câu lỗi cũ", () => {
    const r = staffIdSchema.safeParse("khong-phai-uuid");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe("Mã nhân sự không hợp lệ.");
  });
});

describe("submitAccountAccessRequestSchema.khoa_id — NEN-016", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const base = { ho_ten: "Nguyễn Văn A", email: "a@bv103.vn", khoa_id: V4, chuc_danh_id: V4, ly_do: "Cần tài khoản để giám sát" };

  it("nhận id khoa seed không chuẩn RFC, vẫn cắt khoảng trắng", () => {
    const r = parseOrFirstError(submitAccountAccessRequestSchema, { ...base, khoa_id: ` ${SEED} ` });
    expect(r.ok && r.data.khoa_id).toBe(SEED);
  });

  it("nhận UUID v4 chuẩn", () => {
    expect(parseOrFirstError(submitAccountAccessRequestSchema, base).ok).toBe(true);
  });

  it("vẫn từ chối chuỗi rác với câu lỗi cũ", () => {
    expect(parseOrFirstError(submitAccountAccessRequestSchema, { ...base, khoa_id: "khong-phai-uuid" })).toEqual({
      ok: false,
      error: "Khoa / phòng không hợp lệ — chọn lại từ danh sách.",
    });
  });
});

/** NEN-016 lát B2: `chuc_danh_id` của yêu cầu cấp tài khoản dùng `z.guid()` (giữ trim + min(1) + hai thông điệp). */
describe("submitAccountAccessRequestSchema.chuc_danh_id — NEN-016 B2", () => {
  const SEED = "aaaaaaaa-bbbb-cccc-dddd-000000000001";
  const V4 = "3f2b8c1e-9a4d-4e6b-8c2f-1d5a7b9e0c34";
  const base = { ho_ten: "Nguyễn Văn A", email: "a@bv103.vn", khoa_id: V4, chuc_danh_id: V4, ly_do: "Cần tài khoản để giám sát" };

  it("nhận id chức danh seed không chuẩn RFC, vẫn cắt khoảng trắng", () => {
    const r = parseOrFirstError(submitAccountAccessRequestSchema, { ...base, chuc_danh_id: ` ${SEED} ` });
    expect(r.ok && r.data.chuc_danh_id).toBe(SEED);
  });

  it("nhận UUID v4 chuẩn", () => {
    expect(parseOrFirstError(submitAccountAccessRequestSchema, base).ok).toBe(true);
  });

  it("vẫn từ chối chuỗi rác và chuỗi trống với câu lỗi cũ", () => {
    expect(parseOrFirstError(submitAccountAccessRequestSchema, { ...base, chuc_danh_id: "khong-phai-uuid" })).toEqual({
      ok: false,
      error: "Chức danh không hợp lệ — chọn lại từ danh mục.",
    });
    expect(parseOrFirstError(submitAccountAccessRequestSchema, { ...base, chuc_danh_id: "  " })).toEqual({
      ok: false,
      error: "Chọn chức danh từ danh mục.",
    });
  });
});
