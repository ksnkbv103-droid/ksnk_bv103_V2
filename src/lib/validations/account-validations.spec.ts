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
    });
    expect(r.ok).toBe(true);
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
