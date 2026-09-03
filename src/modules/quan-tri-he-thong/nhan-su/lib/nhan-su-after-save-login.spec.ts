import { describe, expect, it } from "vitest";
import { resolveAssignableRoleName } from "./nhan-su-after-save-login";

describe("resolveAssignableRoleName", () => {
  it("nhận mã vai trò hoặc nhãn tiếng Việt", () => {
    expect(resolveAssignableRoleName("nhan_vien_ksnk")).toBe("NHAN_VIEN_KSNK");
    expect(resolveAssignableRoleName("Nhân viên khoa KSNK")).toBe("NHAN_VIEN_KSNK");
  });
});
