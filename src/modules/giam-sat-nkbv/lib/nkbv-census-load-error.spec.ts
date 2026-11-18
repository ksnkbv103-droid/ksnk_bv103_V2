import { describe, expect, it } from "vitest";
import { gopLoiTaiCensus, goiYChonBnTheoKhoa } from "./nkbv-census-load-error";

describe("NKBV-037 gopLoiTaiCensus", () => {
  it("hai nhánh cùng câu chặn quyền → một câu (một toast)", () => {
    const chan = "Hội đồng KSNK không xem danh sách có danh tính";
    expect(gopLoiTaiCensus(chan, chan)).toBe(chan);
  });

  it("không có lỗi → null", () => {
    expect(gopLoiTaiCensus(null, undefined, "  ")).toBeNull();
  });

  it("hai lỗi khác nhau → gộp một câu", () => {
    expect(gopLoiTaiCensus("Lỗi A", "Lỗi B")).toBe("Lỗi A · Lỗi B");
  });
});

describe("NKBV-037 goiYChonBnTheoKhoa", () => {
  const base = { coKhoa: true, dangTai: false, soBn: 0, locMdro: true, loiTai: null };

  it("lỗi tải không được nói thành «không có BN»", () => {
    const goiY = goiYChonBnTheoKhoa({ ...base, loiTai: "Bị chặn" });
    expect(goiY).not.toMatch(/Không có BN/);
    expect(goiY).toMatch(/Không tải được/);
    expect(goiYChonBnTheoKhoa({ ...base, locMdro: false, loiTai: "Bị chặn" })).not.toMatch(/Không có BN/);
  });

  it("tải xong, khoa thật sự không có ca → giữ câu cũ", () => {
    expect(goiYChonBnTheoKhoa(base)).toBe("Không có BN đa kháng còn nằm tại khoa");
    expect(goiYChonBnTheoKhoa({ ...base, locMdro: false })).toBe(
      "Không có BN còn nằm viện tại khoa — nhập tay bên dưới",
    );
  });

  it("chưa chọn khoa / đang tải / có BN → câu cũ", () => {
    expect(goiYChonBnTheoKhoa({ ...base, coKhoa: false })).toBe("Chọn khoa ở khung trên trước…");
    expect(goiYChonBnTheoKhoa({ ...base, dangTai: true })).toBe("Đang tải danh sách…");
    expect(goiYChonBnTheoKhoa({ ...base, soBn: 2 })).toBe("— Chọn BN đa kháng còn nằm viện —");
  });
});
