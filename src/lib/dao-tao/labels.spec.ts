import { describe, expect, it } from "vitest";
import { labelCheDoThi, labelLoaiCau, labelTrangThaiKy, parseGan } from "@/lib/dao-tao/labels";

describe("dao-tao labels", () => {
  it("dịch loại câu và trạng thái kỳ", () => {
    expect(labelLoaiCau("single")).toBe("Chọn một");
    expect(labelLoaiCau("order")).toBe("Sắp xếp");
    expect(labelTrangThaiKy("published")).toBe("Đang mở");
    expect(labelCheDoThi("thi_thu")).toBe("Ôn tập");
  });

  it("parse gan jsonb an toàn", () => {
    expect(parseGan(null)).toEqual({ khoa_ids: [], nhan_su_ids: [] });
    expect(parseGan({ khoa_ids: ["a"], nhan_su_ids: ["b"] })).toEqual({
      khoa_ids: ["a"],
      nhan_su_ids: ["b"],
    });
  });
});
