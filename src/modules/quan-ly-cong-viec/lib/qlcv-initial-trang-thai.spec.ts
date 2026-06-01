import { describe, expect, it } from "vitest";
import { resolveQlcvTrangThaiMaForTask } from "./qlcv-initial-trang-thai";

describe("resolveQlcvTrangThaiMaForTask", () => {
  it("đề xuất inactive → MOI", () => {
    expect(resolveQlcvTrangThaiMaForTask({ isActive: false, nguoi_phu_trach_id: "x" })).toBe("MOI");
  });

  it("đã giao phụ trách → DANG_LAM", () => {
    expect(resolveQlcvTrangThaiMaForTask({ isActive: true, nguoi_phu_trach_id: "ns-1" })).toBe("DANG_LAM");
  });

  it("active chưa giao → MOI", () => {
    expect(resolveQlcvTrangThaiMaForTask({ isActive: true })).toBe("MOI");
  });
});
