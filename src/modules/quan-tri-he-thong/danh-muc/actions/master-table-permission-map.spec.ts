import { describe, expect, it } from "vitest";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";

describe("getRegistryModuleForMasterTable", () => {
  it("maps sys_roles to PHAN_QUYEN", () => {
    expect(getRegistryModuleForMasterTable("sys_roles")).toBe("PHAN_QUYEN");
  });

  it("maps regular master tables to expected modules", () => {
    expect(getRegistryModuleForMasterTable("mdm_dm_khoa_phong")).toBe("KHOA_PHONG");
    expect(getRegistryModuleForMasterTable("mdm_nhan_su")).toBe("NHAN_SU");
  });

  it("maps domain lookup tables", () => {
    expect(getRegistryModuleForMasterTable("mdm_dm_to_cong_tac")).toBe("DANH_MUC_ORG");
    expect(getRegistryModuleForMasterTable("gstt_dm_khu_vuc_giam_sat")).toBe("DANH_MUC_GSTT");
    expect(getRegistryModuleForMasterTable("cssd_dm_tram")).toBe("DANH_MUC_CSSD_LOOKUP");
  });

  it("returns null for unknown table", () => {
    expect(getRegistryModuleForMasterTable("unknown_table")).toBeNull();
  });

  it("không còn map tên bảng bảng kiểm legacy", () => {
    expect(getRegistryModuleForMasterTable("danh_muc_bang_kiem")).toBeNull();
    expect(getRegistryModuleForMasterTable("tieu_chi_bang_kiem")).toBeNull();
  });
});
