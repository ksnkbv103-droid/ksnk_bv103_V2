import { describe, expect, it } from "vitest";
import { quanTriDungCuHref } from "./quan-tri-paths";

describe("quanTriDungCuHref", () => {
  it("loại là trang gốc", () => {
    expect(quanTriDungCuHref()).toBe("/quan-tri-he-thong/danh-muc/dung-cu");
    expect(quanTriDungCuHref("loai")).toBe("/quan-tri-he-thong/danh-muc/dung-cu");
  });

  it("bookmark thành phần cũ vào tab bộ", () => {
    expect(quanTriDungCuHref("bo")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=bo");
    expect(quanTriDungCuHref("chi-tiet")).toBe("/quan-tri-he-thong/danh-muc/dung-cu?tab=bo");
  });
});
