import { describe, expect, it } from "vitest";
import { sumTrongBoActive } from "./cssd-trong-bo-by-loai";

describe("sumTrongBoActive", () => {
  it("bỏ dòng thuộc bộ đã vô hiệu, cộng dồn bộ còn hoạt động", () => {
    const rows = [
      { loai_dung_cu_id: "L1", bo_dung_cu_id: "B1", so_luong_thuc_te: 2 },
      { loai_dung_cu_id: "L1", bo_dung_cu_id: "B2", so_luong_thuc_te: 3 },
      { loai_dung_cu_id: "L1", bo_dung_cu_id: "OFF", so_luong_thuc_te: 1 },
      { loai_dung_cu_id: "L2", bo_dung_cu_id: "OFF", so_luong_thuc_te: 5 },
    ];
    const m = sumTrongBoActive(rows, new Set(["B1", "B2"]));
    expect(m.get("L1")).toBe(5);
    expect(m.has("L2")).toBe(false);
  });
});
