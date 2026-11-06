import { describe, expect, it } from "vitest";
import { ksnkStaffAllows, networkOperatorAllows } from "./rbac-ksnk-role-mappings";

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

  it("ME-04: NV KSNK giữ edit mẻ thường; không qc / nha_implant", () => {
    expect(ksnkStaffAllows("CSSD_ME_TIET_KHUAN", "edit")).toBe(true);
    expect(ksnkStaffAllows("CSSD_ME_TIET_KHUAN", "qc")).toBe(false);
    expect(ksnkStaffAllows("CSSD_ME_TIET_KHUAN", "nha_implant")).toBe(false);
  });
});

describe("MANG_LUOI_KSNK preset — chỉ giám sát, sự cố, đào tạo; không thuộc phạm vi QLCV nội bộ", () => {
  it("cho phép giám sát VST, GSC, NKBV, sự cố và đào tạo", () => {
    expect(networkOperatorAllows("GIAM_SAT_VST", "view")).toBe(true);
    expect(networkOperatorAllows("GIAM_SAT_VST", "create")).toBe(true);
    expect(networkOperatorAllows("GIAM_SAT_CHUNG", "view")).toBe(true);
    expect(networkOperatorAllows("GIAM_SAT_NKBV", "view")).toBe(true);
    expect(networkOperatorAllows("BAO_SU_CO", "create")).toBe(true);
    expect(networkOperatorAllows("DAO_TAO", "create")).toBe(true);
  });

  it("không cấp quyền CONG_VIEC cho nhân sự mạng lưới (tuân thủ ksnk-boundary)", () => {
    expect(networkOperatorAllows("CONG_VIEC", "view")).toBe(false);
    expect(networkOperatorAllows("CONG_VIEC", "create")).toBe(false);
    expect(networkOperatorAllows("CONG_VIEC", "edit")).toBe(false);
    expect(networkOperatorAllows("CONG_VIEC", "delete")).toBe(false);
  });
});
