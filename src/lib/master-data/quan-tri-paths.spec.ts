import { describe, expect, it } from "vitest";
import { parseDungCuLayer, parseDungCuLoaiSheet, quanTriDungCuHref, quanTriTaiKhoanHref } from "./quan-tri-paths";

describe("quanTriTaiKhoanHref", () => {
  it("hub tài khoản quản trị", () => {
    expect(quanTriTaiKhoanHref()).toBe("/quan-tri-he-thong/tai-khoan");
  });
});

describe("quanTriDungCuHref", () => {
  it("mặc định và loai → tab Loại (?tab=loai)", () => {
    expect(quanTriDungCuHref()).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=loai");
    expect(quanTriDungCuHref("loai")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=loai");
  });

  it("bộ / chi-tiết → ?tab=bo (một click khỏi Loại)", () => {
    expect(quanTriDungCuHref("bo")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=bo");
    expect(quanTriDungCuHref("chi-tiet")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=bo");
  });

  it("phiếu chờ và lịch sử dùng tab query", () => {
    expect(quanTriDungCuHref("phieu")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=phieu");
    expect(quanTriDungCuHref("lich-su")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=lich-su");
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
