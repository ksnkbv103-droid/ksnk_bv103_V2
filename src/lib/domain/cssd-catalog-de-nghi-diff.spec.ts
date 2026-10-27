import { describe, expect, it } from "vitest";
import { buildDeNghiDiffRows } from "./cssd-catalog-de-nghi-diff";

const base = { targetId: "x", targetMa: "B01.SET.01", targetTen: "Bộ 1" };

describe("buildDeNghiDiffRows", () => {
  it("LOAI: chỉ liệt kê trường đổi, cũ → mới", () => {
    const rows = buildDeNghiDiffRows({
      ...base,
      targetKind: "LOAI",
      payloadBefore: { ten_loai: "Kéo", is_chiu_nhiet: true },
      payloadAfter: { ten_loai: "Kéo cắt", is_chiu_nhiet: true },
    });
    expect(rows).toEqual([{ doiTuong: "Loại dụng cụ B01.SET.01", truong: "Tên loại", cu: "Kéo", moi: "Kéo cắt" }]);
  });

  it("BOM: sửa số lượng, thêm mới, xóa", () => {
    const rows = buildDeNghiDiffRows({
      ...base,
      targetKind: "BOM",
      payloadBefore: {
        lines: [
          { op: "UPSERT", chiTietId: "c1", maLoai: "KEO", tenDungCuLe: "Kéo", soLuong: 1 },
          { op: "UPSERT", chiTietId: "c2", maLoai: "GU", tenDungCuLe: "Gù", soLuong: 2 },
        ],
      },
      payloadAfter: {
        lines: [
          { op: "UPSERT", chiTietId: "c1", maLoai: "KEO", tenDungCuLe: "Kéo", soLuong: 3 },
          { op: "DELETE", chiTietId: "c2", maLoai: "GU", tenDungCuLe: "Gù" },
          { op: "UPSERT", loaiDungCuId: "l9", maLoai: "KEP", tenDungCuLe: "Kẹp", soLuong: 2 },
        ],
      },
    });
    expect(rows.map((r) => [r.truong, r.cu, r.moi])).toEqual([
      ["KEO · Kéo", "1", "3"],
      ["GU · Gù", "2", "Xóa khỏi bộ"],
      ["KEP · Kẹp", "—", "2"],
    ]);
  });

  it("CREATE: cũ là «—»", () => {
    const rows = buildDeNghiDiffRows({
      ...base,
      targetKind: "BO",
      payloadBefore: { __op: "CREATE" },
      payloadAfter: { __op: "CREATE", ma_bo: "B09", ten_bo: "Bộ mới" },
    });
    expect(rows.map((r) => [r.truong, r.cu, r.moi])).toEqual([
      ["Mã bộ", "—", "B09"],
      ["Tên bộ", "—", "Bộ mới"],
    ]);
  });
});
