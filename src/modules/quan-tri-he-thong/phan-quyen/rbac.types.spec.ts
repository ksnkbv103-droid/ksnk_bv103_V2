import { describe, expect, it } from "vitest";
import {
  RBAC_MATRIX_ROLE_HEADER_LABEL,
  RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER,
  selectRolesForRbacMatrixColumns,
  selectRolesForStaffKsnkAssignment,
} from "./rbac.types";

describe("rbac.types taxonomy (5 chân dung)", () => {
  it("cột ma trận: Admin · Hội đồng · NV · Mạng lưới · Khách", () => {
    const cols = selectRolesForRbacMatrixColumns([
      { id: "1", name: "THANH_VIEN_MANG_LUOI_KSNK" },
      { id: "2", name: "KHACH_THONG_KE_GSTT" },
      { id: "3", name: "MANG_LUOI_KSNK" },
      { id: "4", name: "ADMIN" },
      { id: "5", name: "NHAN_VIEN_KSNK" },
      { id: "6", name: "HOI_DONG_KSNK" },
      { id: "7", name: "BAN_QLCL" },
    ]);
    expect(cols.map((r) => r.name)).toEqual([
      "ADMIN",
      "HOI_DONG_KSNK",
      "NHAN_VIEN_KSNK",
      "MANG_LUOI_KSNK",
      "KHACH_THONG_KE_GSTT",
    ]);
  });

  it("dropdown staff không gồm ADMIN / Tổ trưởng / QLCL", () => {
    expect([...RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER]).toEqual([
      "HOI_DONG_KSNK",
      "NHAN_VIEN_KSNK",
      "MANG_LUOI_KSNK",
      "KHACH_THONG_KE_GSTT",
    ]);
    const staff = selectRolesForStaffKsnkAssignment([
      { id: "a", name: "ADMIN" },
      { id: "b", name: "TO_TRUONG_MANG_LUOI_KSNK" },
      { id: "c", name: "MANG_LUOI_KSNK" },
      { id: "d", name: "NHAN_VIEN_KSNK" },
    ]);
    expect(staff.map((r) => r.name)).toEqual(["NHAN_VIEN_KSNK", "MANG_LUOI_KSNK"]);
  });

  it("nhãn UI mạng lưới / khách", () => {
    expect(RBAC_MATRIX_ROLE_HEADER_LABEL.MANG_LUOI_KSNK).toBe("Mạng lưới KSNK");
    expect(RBAC_MATRIX_ROLE_HEADER_LABEL.KHACH_THONG_KE_GSTT).toContain("Khách");
  });

  it("VST-028: vai LANH_DAO_KHOA hiện ở ma trận (sau CHU_NHIEM_KHOA), chưa gán được từ trang nhân sự", () => {
    const cols = selectRolesForRbacMatrixColumns([
      { id: "1", name: "NHAN_VIEN_KSNK" },
      { id: "2", name: "LANH_DAO_KHOA" },
      { id: "3", name: "CHU_NHIEM_KHOA" },
    ]);
    expect(cols.map((r) => r.name)).toEqual(["CHU_NHIEM_KHOA", "LANH_DAO_KHOA", "NHAN_VIEN_KSNK"]);
    expect(RBAC_MATRIX_ROLE_HEADER_LABEL.LANH_DAO_KHOA).toContain("Lãnh đạo khoa");
    expect([...RBAC_STAFF_ASSIGNABLE_KSNK_ROLE_ORDER]).not.toContain("LANH_DAO_KHOA");
  });
});
