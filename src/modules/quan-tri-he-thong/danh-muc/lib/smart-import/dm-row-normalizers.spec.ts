import { describe, it, expect } from "vitest";
import { normalizeDmThietBi, normalizeDmHoaChat } from "./dm-row-normalizers";

describe("normalizeDmThietBi", () => {
  it("should pack flat specification columns into specs JSONB object and delete flat keys", () => {
    const input = {
      ma_thiet_bi: "TB001",
      ten_thiet_bi: "Máy tiệt khuẩn hấp 1",
      hang_san_xuat: "Getinge",
      nam_san_xuat: "2022",
      ghi_chu: "Lắp đặt tại phòng CSSD chính",
      chu_ky_bao_tri_ngay: "90",
      trang_thai: "READY"
    };

    const result = normalizeDmThietBi(input);

    // 1. Kiểm tra specs JSONB đã gộp đúng
    expect(result.specs).toEqual({
      hang_san_xuat: "Getinge",
      nam_san_xuat: 2022,
      ghi_chu: "Lắp đặt tại phòng CSSD chính"
    });

    // 2. Kiểm tra các trường phẳng cũ đã bị xóa khỏi payload
    expect(result.hang_san_xuat).toBeUndefined();
    expect(result.nam_san_xuat).toBeUndefined();
    expect(result.ghi_chu).toBeUndefined();

    // 3. Kiểm tra các trường khác được chuẩn hóa đúng
    expect(result.ma_thiet_bi).toBe("TB001");
    expect(result.ten_thiet_bi).toBe("Máy tiệt khuẩn hấp 1");
    expect(result.chu_ky_bao_tri_ngay).toBe(90);
    expect(result.trang_thai).toBe("READY");
  });

  it("should handle empty or null values gracefully", () => {
    const input = {
      ma_thiet_bi: "TB002",
      ten_thiet_bi: "Máy rửa siêu âm",
      hang_san_xuat: "",
      nam_san_xuat: null,
      ghi_chu: undefined,
      chu_ky_bao_tri_ngay: "",
      trang_thai: ""
    };

    const result = normalizeDmThietBi(input);

    expect(result.specs).toEqual({
      hang_san_xuat: null,
      nam_san_xuat: null,
      ghi_chu: null
    });

    expect(result.chu_ky_bao_tri_ngay).toBe(180); // Mặc định
    expect(result.trang_thai).toBe("READY"); // Mặc định
  });
});

describe("normalizeDmHoaChat", () => {
  it("should pack flat specification columns into specs JSONB object and delete flat keys", () => {
    const input = {
      ma_hoa_chat: "HC001",
      ten_hoa_chat: "Cồn 70 độ",
      loai_hoa_chat: "hoa_chat",
      quy_cach: "Chai 1L",
      nong_do: "70%",
      ghi_chu: "Dễ cháy, bảo quản mát"
    };

    const result = normalizeDmHoaChat(input);

    // 1. Kiểm tra specs JSONB đã gộp đúng
    expect(result.specs).toEqual({
      quy_cach: "Chai 1L",
      nong_do: "70%",
      ghi_chu: "Dễ cháy, bảo quản mát"
    });

    // 2. Kiểm tra các trường phẳng cũ đã bị xóa khỏi payload
    expect(result.quy_cach).toBeUndefined();
    expect(result.nong_do).toBeUndefined();
    expect(result.ghi_chu).toBeUndefined();

    // 3. Kiểm tra các trường khác được chuẩn hóa đúng
    expect(result.ma_hoa_chat).toBe("HC001");
    expect(result.ten_hoa_chat).toBe("Cồn 70 độ");
    expect(result.loai_hoa_chat).toBe("HOA_CHAT");
  });

  it("should handle empty or null values gracefully", () => {
    const input = {
      ma_hoa_chat: "HC002",
      ten_hoa_chat: "Xà phòng rửa tay",
      loai_hoa_chat: "",
      quy_cach: "",
      nong_do: null,
      ghi_chu: undefined
    };

    const result = normalizeDmHoaChat(input);

    expect(result.specs).toEqual({
      quy_cach: null,
      nong_do: null,
      ghi_chu: null
    });

    expect(result.loai_hoa_chat).toBe("HOA_CHAT"); // Mặc định
  });
});

