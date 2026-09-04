import { describe, expect, it } from "vitest";
import { parseDungCuLayer, parseDungCuLoaiSheet, quanTriDungCuHref } from "./quan-tri-paths";

describe("quanTriDungCuHref", () => {
  it("mặc định và bookmark bộ/chi tiết là lớp Bộ (không query)", () => {
    expect(quanTriDungCuHref()).toBe("/quan-tri-he-thong/danh-muc/dung-cu");
    expect(quanTriDungCuHref("bo")).toBe("/quan-tri-he-thong/danh-muc/dung-cu");
    expect(quanTriDungCuHref("chi-tiet")).toBe("/quan-tri-he-thong/danh-muc/dung-cu");
  });

  it("phiếu chờ và lịch sử dùng tab query", () => {
    expect(quanTriDungCuHref("phieu")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=phieu");
    expect(quanTriDungCuHref("lich-su")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=lich-su");
  });

  it("loại không còn tab peer — sheet phụ", () => {
    expect(quanTriDungCuHref("loai")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?sheet=loai");
  });
});

describe("parseDungCuLayer", () => {
  it("tab cũ loai/bo/chi-tiet và trống đều về Bộ", () => {
    expect(parseDungCuLayer(null)).toBe("bo");
    expect(parseDungCuLayer("bo")).toBe("bo");
    expect(parseDungCuLayer("loai")).toBe("bo");
    expect(parseDungCuLayer("chi-tiet")).toBe("bo");
    expect(parseDungCuLayer("phieu")).toBe("phieu");
    expect(parseDungCuLayer("lich-su")).toBe("lich-su");
  });
});

describe("parseDungCuLoaiSheet", () => {
  it("mở sheet khi sheet=loai hoặc bookmark tab=loai", () => {
    expect(parseDungCuLoaiSheet(null, "loai")).toBe(true);
    expect(parseDungCuLoaiSheet("loai", null)).toBe(true);
    expect(parseDungCuLoaiSheet("phieu", null)).toBe(false);
    expect(parseDungCuLoaiSheet("bo", null)).toBe(false);
  });
});
