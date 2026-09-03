import { describe, expect, it } from "vitest";
import { ksnkStaffAllows } from "./rbac-ksnk-role-mappings";

describe("NHAN_VIEN_KSNK preset — master CSSD chỉ xem", () => {
  it.each(["LOAI_DC", "BO_DC", "DC_LE", "THIET_BI", "HOA_CHAT"] as const)(
    "%s: xem được, không sửa/nạp",
    (mod) => {
      expect(ksnkStaffAllows(mod, "view")).toBe(true);
      expect(ksnkStaffAllows(mod, "edit")).toBe(false);
      expect(ksnkStaffAllows(mod, "create")).toBe(false);
      expect(ksnkStaffAllows(mod, "delete")).toBe(false);
      expect(ksnkStaffAllows(mod, "import")).toBe(false);
    },
  );

  it("vẫn vận hành CSSD và báo sự cố", () => {
    expect(ksnkStaffAllows("CSSD_WORKFLOW", "edit")).toBe(true);
    expect(ksnkStaffAllows("BAO_SU_CO", "create")).toBe(true);
  });
});
