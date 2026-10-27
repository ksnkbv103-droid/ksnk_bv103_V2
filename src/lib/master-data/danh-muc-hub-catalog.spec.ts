import { describe, expect, it } from "vitest";
import { getAllDanhMucHubRows } from "./danh-muc-hub-catalog";

describe("danh-muc-hub-catalog CSSD dụng cụ", () => {
  it("bộ/loại sửa ở màn CSSD — hub quản trị không còn entry dụng cụ", () => {
    const rows = getAllDanhMucHubRows({ stats: {} });
    const ids = rows.filter((r) => r.group === "cssd" && r.tier === "dedicated").map((r) => r.id);
    expect(ids).not.toContain("dung-cu-bo");
    expect(ids).not.toContain("dung-cu-loai");
  });
});
