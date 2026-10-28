import { describe, expect, it } from "vitest";
import { locNhomTheoLoai, maNhomKhongTrung, sinhMaNhom } from "./cssd-hoa-chat-nhom";

describe("cssd-hoa-chat-nhom", () => {
  it("sinh mã không dấu, upper, dùng _", () => {
    expect(sinhMaNhom("Khử khuẩn mức độ cao")).toBe("KHU_KHUAN_MUC_DO_CAO");
    expect(sinhMaNhom("Đóng gói / bao")).toBe("DONG_GOI_BAO");
    expect(sinhMaNhom("!!!")).toBe("NHOM");
  });
  it("chống trùng mã", () => {
    expect(maNhomKhongTrung("KHAC", ["KHAC", "khac_2"])).toBe("KHAC_3");
    expect(maNhomKhongTrung("MOI", ["KHAC"])).toBe("MOI");
  });
  it("lọc theo loại, bỏ nhóm ngừng", () => {
    const l = [
      { loai_hoa_chat: "HOA_CHAT", is_active: true },
      { loai_hoa_chat: "HOA_CHAT", is_active: false },
      { loai_hoa_chat: "VAT_TU", is_active: true },
    ];
    expect(locNhomTheoLoai(l, "HOA_CHAT")).toHaveLength(1);
    expect(locNhomTheoLoai(l, "HOA_CHAT", { gomNgung: true })).toHaveLength(2);
  });
});
