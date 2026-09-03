import { describe, expect, it } from "vitest";
import { loaiListSortColumn, mapLoaiPhysicalToListRow, splitLoaiStock } from "./cssd-loai-list-map";

describe("cssd-loai-list-map", () => {
  it("maps physical columns + specs to list row", () => {
    const row = mapLoaiPhysicalToListRow({
      id: "a",
      ma_loai: "DC.KEO.0001",
      ten_loai: "Kéo cắt chỉ",
      is_chiu_nhiet: true,
      phan_loai_spaulding: "CRITICAL",
      phuong_phap_tiet_khuan_chi_dinh: "STEAM_134",
      phan_loai: "PHAU_THUAT",
      so_luong_kho_du_phong: 2,
      is_active: true,
      specs: { kich_thuoc: "150 mm", cong_dung: "Cắt chỉ" },
    });
    expect(row.ma_danh_muc).toBe("DC.KEO.0001");
    expect(row.ten_danh_muc).toBe("Kéo cắt chỉ");
    expect(row.kich_thuoc).toBe("150 mm");
    expect(row.so_luong_kho_du_phong).toBe(2);
    expect(row.so_luong_trong_bo).toBe(0);
    expect(row.so_luong_tong).toBe(2);
  });

  it("maps UI sort keys to physical columns", () => {
    expect(loaiListSortColumn("ma_danh_muc")).toBe("ma_loai");
    expect(loaiListSortColumn("unknown")).toBe("ma_loai");
  });

  it("maps tổng = kho + trong bộ when so_luong_trong_bo present", () => {
    const row = mapLoaiPhysicalToListRow({
      id: "b",
      ma_loai: "DC.KEO.0002",
      ten_loai: "Kéo",
      so_luong_kho_du_phong: 2,
      so_luong_trong_bo: 5,
    });
    expect(row.so_luong_tong).toBe(7);
    expect(row.so_luong_trong_bo).toBe(5);
  });

  it("splits type stock: total = in sets + warehouse", () => {
    expect(splitLoaiStock(2, 5)).toEqual({
      so_luong_kho_du_phong: 2,
      so_luong_trong_bo: 5,
      so_luong_tong: 7,
    });
    expect(splitLoaiStock(-1, Number.NaN)).toEqual({
      so_luong_kho_du_phong: 0,
      so_luong_trong_bo: 0,
      so_luong_tong: 0,
    });
  });
});
