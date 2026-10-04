import { describe, expect, it } from "vitest";
import { staffKsnkRoleDisplayLabel } from "@/modules/quan-tri-he-thong/phan-quyen/rbac.types";
import { resolveAssignableRoleName } from "./nhan-su-after-save-login";

describe("resolveAssignableRoleName", () => {
  it("nhận mã vai trò hoặc nhãn tiếng Việt", () => {
    expect(resolveAssignableRoleName("nhan_vien_ksnk")).toBe("NHAN_VIEN_KSNK");
    expect(resolveAssignableRoleName("Nhân viên khoa KSNK")).toBe("NHAN_VIEN_KSNK");
  });
});

describe("staffKsnkRoleDisplayLabel", () => {
  it("mã sys_roles thành nhãn tiếng Việt, mã lạ giữ nguyên", () => {
    expect(staffKsnkRoleDisplayLabel("NHAN_VIEN_KSNK")).toBe("Nhân viên khoa KSNK");
    expect(staffKsnkRoleDisplayLabel("ADMIN")).toBe("Quản trị");
    expect(staffKsnkRoleDisplayLabel("")).toBe("");
    expect(staffKsnkRoleDisplayLabel("ROLE_LA")).toBe("ROLE_LA");
  });
});
