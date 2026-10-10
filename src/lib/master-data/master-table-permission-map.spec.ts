import { describe, expect, it } from "vitest";
import { getAllLoaiDanhMucs, getRegistryEntry } from "./domain-registry";
import { getRegistryModuleForMasterTable } from "./master-table-permission-map";

describe("master-table-permission-map", () => {
  it("mọi sourceTable trong domain-registry đều có module quyền", () => {
    const missing = getAllLoaiDanhMucs()
      .map((loai) => getRegistryEntry(loai).sourceTable)
      .filter((table) => !getRegistryModuleForMasterTable(table));
    expect(missing).toEqual([]);
  });

  it("bảng không khai báo trả null", () => {
    expect(getRegistryModuleForMasterTable("bang_khong_ton_tai")).toBeNull();
  });
});
