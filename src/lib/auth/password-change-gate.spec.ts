import { describe, expect, it } from "vitest";
import { isPasswordChangeExemptPath, metaMustChangePassword } from "./password-change-gate";

describe("password-change-gate", () => {
  it("chỉ cho đổi mật khẩu và đăng nhập khi còn cờ", () => {
    expect(isPasswordChangeExemptPath("/tai-khoan/doi-mat-khau")).toBe(true);
    expect(isPasswordChangeExemptPath("/login")).toBe(true);
    expect(isPasswordChangeExemptPath("/")).toBe(false);
    expect(isPasswordChangeExemptPath("/tai-khoan")).toBe(false);
    expect(isPasswordChangeExemptPath("/tai-khoan/doi-mat-khau-x")).toBe(false);
  });
  it("chỉ true khi cờ đúng boolean true", () => {
    expect(metaMustChangePassword({ must_change_password: true })).toBe(true);
    expect(metaMustChangePassword({ must_change_password: "true" })).toBe(false);
    expect(metaMustChangePassword(null)).toBe(false);
    expect(metaMustChangePassword(undefined)).toBe(false);
  });

  it("nhận diện cờ từ user_metadata, app_metadata hoặc cả hai", () => {
    // Chỉ có user_metadata
    expect(metaMustChangePassword({ must_change_password: true }, null)).toBe(true);
    expect(metaMustChangePassword({ must_change_password: true }, {})).toBe(true);

    // Chỉ có app_metadata
    expect(metaMustChangePassword(null, { must_change_password: true })).toBe(true);
    expect(metaMustChangePassword({}, { must_change_password: true })).toBe(true);
    expect(metaMustChangePassword(undefined, { must_change_password: true })).toBe(true);

    // Cả hai cùng có
    expect(metaMustChangePassword({ must_change_password: true }, { must_change_password: true })).toBe(true);

    // Cả hai đều false hoặc không có
    expect(metaMustChangePassword({ must_change_password: false }, { must_change_password: false })).toBe(false);
    expect(metaMustChangePassword({}, {})).toBe(false);
    expect(metaMustChangePassword(null, undefined)).toBe(false);
  });
});
