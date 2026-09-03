import { describe, expect, it } from "vitest";
import {
  canApproveCatalogChange,
  canProposeCatalogChange,
  planCatalogChangeApply,
  validateCatalogChangeDraft,
} from "./cssd-catalog-change";

const staff = [{ module: "CSSD_WORKFLOW", action: "edit" }];
const staffWithCatalogEdit = [
  ...staff,
  { module: "LOAI_DC", action: "edit" },
  { module: "BO_DC", action: "edit" },
];

describe("cssd-catalog-change gates", () => {
  it("KTV vận hành được đề xuất, không duyệt nếu thiếu APPROVE", () => {
    expect(canProposeCatalogChange(["NHAN_VIEN_KSNK"], staff)).toBe(true);
    expect(canApproveCatalogChange(["NHAN_VIEN_KSNK"], staffWithCatalogEdit, "CHI_TIET", "THEM")).toBe(
      false,
    );
    expect(canApproveCatalogChange(["NHAN_VIEN_KSNK"], staffWithCatalogEdit, "LOAI_DUNG_CU", "SUA")).toBe(
      false,
    );
  });

  it("ADMIN hoặc quyền approve trên module danh mục mới được duyệt", () => {
    expect(canApproveCatalogChange(["ADMIN"], [], "LOAI_DUNG_CU", "THEM")).toBe(true);
    expect(
      canApproveCatalogChange(["NHAN_VIEN_KSNK"], [{ module: "BO_DC", action: "approve" }], "CHI_TIET", "DIEU_CHUYEN"),
    ).toBe(true);
    expect(
      canApproveCatalogChange(["NHAN_VIEN_KSNK"], [{ module: "LOAI_DC", action: "approve" }], "LOAI_DUNG_CU", "XOA"),
    ).toBe(true);
  });
});

describe("cssd-catalog-change planner", () => {
  it("THEM loại → insert cssd_dm_loai_dung_cu", () => {
    const r = planCatalogChangeApply(
      { loaiThaoTac: "THEM", doiTuong: "LOAI_DUNG_CU", lyDo: "Bổ sung loại mới", ma: "DC-K", ten: "Kéo" },
      {},
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ops).toEqual([
      expect.objectContaining({
        op: "insert",
        table: "cssd_dm_loai_dung_cu",
        row: expect.objectContaining({ ma_loai: "DC-K", ten_loai: "Kéo" }),
      }),
    ]);
  });

  it("SUA / XOA thành phần → update hoặc soft-delete master", () => {
    const sua = planCatalogChangeApply(
      { loaiThaoTac: "SUA", doiTuong: "CHI_TIET", lyDo: "Sửa SL", chiTietId: "ct-1", maBo: "B01.SET.01", soLuong: 4 },
      { chiTiet: { id: "ct-1", bo_dung_cu_id: "b1", loai_dung_cu_id: "l1", ten_dung_cu_le: "Kéo", so_luong: 2, is_active: true } },
    );
    expect(sua.ok).toBe(true);
    if (sua.ok) {
      expect(sua.ops[0]).toMatchObject({ op: "update", table: "cssd_dm_bo_dung_cu_chi_tiet", id: "ct-1" });
    }
    const xoa = planCatalogChangeApply(
      { loaiThaoTac: "XOA", doiTuong: "CHI_TIET", lyDo: "Gỡ khỏi bộ", chiTietId: "ct-1", maBo: "B01.SET.01" },
      { chiTiet: { id: "ct-1", bo_dung_cu_id: "b1", loai_dung_cu_id: "l1", ten_dung_cu_le: "Kéo", so_luong: 2, is_active: true } },
    );
    expect(xoa.ok).toBe(true);
    if (xoa.ok) {
      expect(xoa.ops).toEqual([{ op: "soft_delete", table: "cssd_dm_bo_dung_cu_chi_tiet", id: "ct-1" }]);
    }
  });

  it("DIEU_CHUYEN giữa hai bộ: giảm nguồn, tăng đích, ghi sổ", () => {
    const r = planCatalogChangeApply(
      {
        loaiThaoTac: "DIEU_CHUYEN",
        doiTuong: "CHI_TIET",
        lyDo: "Chuyển 2 kéo",
        maBo: "B01.SET.01",
        maBoDen: "B01.SET.02",
        loaiDungCuId: "l1",
        soLuong: 2,
      },
      {
        bo: { id: "b1", ma_bo: "B01.SET.01", ten_bo: "Bộ A", is_active: true },
        boDen: { id: "b2", ma_bo: "B01.SET.02", ten_bo: "Bộ B", is_active: true },
        chiTiet: { id: "ct-1", bo_dung_cu_id: "b1", loai_dung_cu_id: "l1", ten_dung_cu_le: "Kéo", so_luong: 5, is_active: true },
        chiTietDen: { id: "ct-2", so_luong: 1 },
      },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ops).toEqual([
      expect.objectContaining({ op: "update", table: "cssd_dm_bo_dung_cu_chi_tiet", id: "ct-1", row: expect.objectContaining({ so_luong: 3 }) }),
      expect.objectContaining({ op: "update", table: "cssd_dm_bo_dung_cu_chi_tiet", id: "ct-2", row: expect.objectContaining({ so_luong: 3 }) }),
      expect.objectContaining({
        op: "ledger",
        loaiGiaoDich: "DIEU_CHUYEN",
        boDungCuId: "b1",
        boDungCuIdDen: "b2",
        soLuong: 2,
      }),
    ]);
  });

  it("từ chối draft thiếu lý do", () => {
    expect(validateCatalogChangeDraft({ loaiThaoTac: "THEM", doiTuong: "CHI_TIET", lyDo: "", maBo: "B01.SET.01" })).toMatch(
      /lý do/,
    );
  });
});
