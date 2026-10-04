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

  it("chỉ có tổ, không phụ trách → MOI (không DANG_LAM)", () => {
    expect(
      resolveQlcvTrangThaiMaForTask({
        isActive: true,
        to_cong_tac_id: "to-1",
        nguoi_phu_trach_id: null,
      }),
    ).toBe("MOI");
  });
});
