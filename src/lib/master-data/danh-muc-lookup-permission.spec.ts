import { describe, expect, it } from "vitest";
import { danhMucLookupPermissionCandidates } from "./danh-muc-lookup-permission";

describe("danh-muc-lookup-permission — DM-6", () => {
  it("lookup đã tách: xem vẫn nhận quyền cũ DANH_MUC.view", () => {
    expect(danhMucLookupPermissionCandidates("DANH_MUC_ORG", "view")).toEqual([
      { moduleKey: "DANH_MUC_ORG", action: "view" },
      { moduleKey: "DANH_MUC", action: "view" },
    ]);
    expect(danhMucLookupPermissionCandidates("DANH_MUC_GSTT", "view")).toHaveLength(2);
    expect(danhMucLookupPermissionCandidates("DANH_MUC_CSSD_LOOKUP", "view")).toHaveLength(2);
  });

  it("lookup đã tách: sửa/xóa/nạp không còn cửa DANH_MUC.edit", () => {
    for (const action of ["create", "edit", "delete", "import"] as const) {
      expect(danhMucLookupPermissionCandidates("DANH_MUC_ORG", action)).toEqual([
        { moduleKey: "DANH_MUC_ORG", action },
      ]);
      expect(danhMucLookupPermissionCandidates("DANH_MUC_GSTT", action)).toEqual([
        { moduleKey: "DANH_MUC_GSTT", action },
      ]);
      expect(danhMucLookupPermissionCandidates("DANH_MUC_CSSD_LOOKUP", action)).toEqual([
        { moduleKey: "DANH_MUC_CSSD_LOOKUP", action },
      ]);
    }
  });

  it("module DANH_MUC gốc không tự thêm ứng viên", () => {
    expect(danhMucLookupPermissionCandidates("DANH_MUC", "edit")).toEqual([
      { moduleKey: "DANH_MUC", action: "edit" },
    ]);
  });
});
