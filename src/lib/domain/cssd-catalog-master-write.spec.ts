import { describe, expect, it } from "vitest";
import {
  assertCssdCatalogMasterWriteAllowed,
  canHardWriteCssdCatalogMaster,
  CSSD_CATALOG_MASTER_MODULES,
  cssdCatalogMasterWriteDeniedMessage,
  formatCatalogApprovalDiff,
  isCssdCatalogMasterTable,
} from "./cssd-catalog-master-write";
import type { SetReconcileLineInput } from "./cssd-set-reconcile";

function line(partial: Partial<SetReconcileLineInput> & Pick<SetReconcileLineInput, "kind">): SetReconcileLineInput {
  return {
    tenDungCuLe: "Kéo",
    soLuongChuan: 4,
    soLuongThucTe: 4,
    soLuongDem: 4,
    ...partial,
  };
}

describe("cssd-catalog-master-write — cổng form MDM", () => {
  it("chỉ ADMIN được ghi cứng form master", () => {
    expect(canHardWriteCssdCatalogMaster({ isAdmin: true })).toBe(true);
    expect(canHardWriteCssdCatalogMaster({ isAdmin: false })).toBe(false);
  });

  it("người có BO_DC.edit nhưng không phải ADMIN bị từ chối", () => {
    expect(() => assertCssdCatalogMasterWriteAllowed(false)).toThrow(cssdCatalogMasterWriteDeniedMessage());
    expect(() => assertCssdCatalogMasterWriteAllowed(true)).not.toThrow();
  });

  it("nhận diện đúng 3 bảng master; không gồm phân bổ khoa", () => {
    expect([...CSSD_CATALOG_MASTER_MODULES]).toEqual(["LOAI_DC", "BO_DC", "DC_LE"]);
    expect(isCssdCatalogMasterTable("cssd_dm_loai_dung_cu")).toBe(true);
    expect(isCssdCatalogMasterTable("cssd_dm_bo_dung_cu")).toBe(true);
    expect(isCssdCatalogMasterTable("cssd_dm_bo_dung_cu_chi_tiet")).toBe(true);
    expect(isCssdCatalogMasterTable("cssd_dm_bo_phan_bo")).toBe(false);
    expect(isCssdCatalogMasterTable("cssd_dm_thiet_bi")).toBe(false);
  });
});

describe("formatCatalogApprovalDiff — trước/sau hàng chờ", () => {
  it("đổi số chuẩn", () => {
    expect(
      formatCatalogApprovalDiff(
        line({ kind: "DOI_CHUAN", maLoai: "B01.CD01", soLuongChuan: 8, soLuongChuanDeXuat: 10 }),
      ),
    ).toEqual({
      kindLabel: "Đổi số chuẩn",
      before: "B01.CD01 — Kéo × 8",
      after: "10",
    });
  });

  it("đổi mã loại", () => {
    expect(
      formatCatalogApprovalDiff(
        line({
          kind: "DOI_LOAI",
          maLoai: "B01.CD01",
          tenDungCuLe: "Kéo cũ",
          maLoaiDeXuat: "B01.CD02",
          tenDungCuLeDeXuat: "Kéo mới",
        }),
      ),
    ).toEqual({
      kindLabel: "Sai mã loại",
      before: "B01.CD01 — Kéo cũ",
      after: "B01.CD02 — Kéo mới",
    });
  });

  it("thêm / xóa dòng", () => {
    expect(formatCatalogApprovalDiff(line({ kind: "THEM_DONG", maLoai: "B01.CD03", soLuongChuanDeXuat: 2 }))).toEqual({
      kindLabel: "Thêm vào bộ",
      before: "—",
      after: "B01.CD03 — Kéo × 2",
    });
    expect(formatCatalogApprovalDiff(line({ kind: "XOA_DONG", maLoai: "B01.CD04", soLuongChuan: 3 }))).toEqual({
      kindLabel: "Xóa khỏi bộ",
      before: "B01.CD04 — Kéo × 3",
      after: "—",
    });
  });
});
