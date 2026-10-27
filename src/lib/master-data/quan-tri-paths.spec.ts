import { describe, expect, it } from "vitest";
import {
  parseDungCuLayer,
  parseDungCuLoaiSheet,
  quanTriDungCuHref,
  quanTriNhanSuChuaTkHref,
  quanTriNhanSuPendingHref,
  quanTriTaiKhoanHref,
} from "./quan-tri-paths";

describe("quanTriTaiKhoanHref", () => {
  it("hub tài khoản quản trị", () => {
    expect(quanTriTaiKhoanHref()).toBe("/quan-tri-he-thong/tai-khoan");
  });
});

describe("cửa nhân sự tài khoản", () => {
  it("phiếu chờ và chưa có TK là hai lọc trên Nhân sự", () => {
    expect(quanTriNhanSuPendingHref()).toBe("/quan-tri-he-thong/nhan-su?pending=1");
    expect(quanTriNhanSuChuaTkHref()).toBe("/quan-tri-he-thong/nhan-su?chuaTk=1");
  });
});

describe("quanTriDungCuHref", () => {
  it("mặc định và loai → tab Loại và kho trên CSSD", () => {
    expect(quanTriDungCuHref()).toBe("/cssd-dung-cu?tab=LOAI");
    expect(quanTriDungCuHref("loai")).toBe("/cssd-dung-cu?tab=LOAI");
  });

  it("bộ / chi-tiết → tab Quản lý (ADMIN)", () => {
    expect(quanTriDungCuHref("bo")).toBe("/cssd-dung-cu?tab=QUAN_LY");
    expect(quanTriDungCuHref("chi-tiet")).toBe("/cssd-dung-cu?tab=QUAN_LY");
  });

  it("phiếu chờ và sổ rà soát → tab Phiếu", () => {
    expect(quanTriDungCuHref("phieu")).toBe("/cssd-dung-cu?tab=DE_NGHI");
    expect(quanTriDungCuHref("lich-su")).toBe("/cssd-dung-cu?tab=DE_NGHI");
  });
});

describe("parseDungCuLayer", () => {
  it("trống / không tab → Loại; bo/chi-tiet → Bộ", () => {
    expect(parseDungCuLayer(null)).toBe("loai");
    expect(parseDungCuLayer(undefined)).toBe("loai");
    expect(parseDungCuLayer("")).toBe("loai");
    expect(parseDungCuLayer("bo")).toBe("bo");
    expect(parseDungCuLayer("loai")).toBe("loai");
    expect(parseDungCuLayer("chi-tiet")).toBe("bo");
    expect(parseDungCuLayer("phieu")).toBe("phieu");
    expect(parseDungCuLayer("lich-su")).toBe("lich-su");
  });

  it("legacy ?sheet=loai mở lớp Loại", () => {
    expect(parseDungCuLayer(null, "loai")).toBe("loai");
    expect(parseDungCuLayer("bo", "loai")).toBe("loai");
  });
});

describe("parseDungCuLoaiSheet", () => {
  it("nhận diện deep-link sheet=loai hoặc tab=loai (tương thích)", () => {
    expect(parseDungCuLoaiSheet(null, "loai")).toBe(true);
    expect(parseDungCuLoaiSheet("loai", null)).toBe(true);
    expect(parseDungCuLoaiSheet("phieu", null)).toBe(false);
    expect(parseDungCuLoaiSheet("bo", null)).toBe(false);
  });
});
