import { describe, expect, it } from "vitest";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";

describe("getRegistryModuleForMasterTable", () => {
  it("maps dm_roles to PHAN_QUYEN", () => {
    expect(getRegistryModuleForMasterTable("dm_roles")).toBe("PHAN_QUYEN");
  });

  it("maps regular master tables to expected modules", () => {
    expect(getRegistryModuleForMasterTable("dm_khoa_phong")).toBe("KHOA_PHONG");
    expect(getRegistryModuleForMasterTable("mdm_nhan_su")).toBe("NHAN_SU");
  });

  it("returns null for unknown table", () => {
    expect(getRegistryModuleForMasterTable("unknown_table")).toBeNull();
  });
});
