import { describe, expect, it } from "vitest";
import { getAllDanhMucHubRows } from "./danh-muc-hub-catalog";
import { quanTriDungCuHref } from "./quan-tri-paths";

describe("danh-muc-hub-catalog CSSD dụng cụ", () => {
  it("chỉ còn peer Quản lý dụng cụ — Loại không còn entry ngang hàng", () => {
    const rows = getAllDanhMucHubRows({ stats: {} });
    const ids = rows.filter((r) => r.group === "cssd" && r.tier === "dedicated").map((r) => r.id);
    expect(ids).toContain("dung-cu-bo");
    expect(ids).not.toContain("dung-cu-loai");
    const bo = rows.find((r) => r.id === "dung-cu-bo");
    expect(bo?.path).toBe(quanTriDungCuHref("bo"));
  });
});
