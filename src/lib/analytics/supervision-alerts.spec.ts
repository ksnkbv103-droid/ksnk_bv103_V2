import { describe, expect, it } from "vitest";
import { buildSupervisionAlerts } from "@/lib/analytics/supervision-alerts";

const khoaScope = [
  { id: "a", label: "Khoa A" },
  { id: "b", label: "Khoa B" },
  { id: "c", label: "Khoa C" },
  { id: "d", label: "Khoa D" },
];

describe("buildSupervisionAlerts", () => {
  it("VST: đủ mẫu dưới 85 vào đỏ; 49 cơ hội chỉ là chưa đủ mẫu; khoa vắng là chưa có phiên", () => {
    const s = buildSupervisionAlerts({
      source: "vst",
      khoaScope,
      matrixKhoa: [
        { id: "a", ten: "Khoa A", tong_co_hoi: 100, da_tuan_thu: 84, ty_le_tuan_thu: 84 },
        { id: "b", ten: "Khoa B", tong_co_hoi: 49, da_tuan_thu: 10, ty_le_tuan_thu: 20.4 },
        { id: "c", ten: "Khoa C", tong_co_hoi: 50, da_tuan_thu: 50, ty_le_tuan_thu: 100 },
      ],
    });
    expect(s.duoi85.map((x) => x.ten)).toEqual(["Khoa A"]);
    expect(s.chuaDuMau.map((x) => x.ten)).toEqual(["Khoa B"]);
    expect(s.chuaCoPhien.map((x) => x.ten)).toEqual(["Khoa D"]);
  });

  it("85% đúng không bị đỏ; GSC dùng tiêu chí áp dụng", () => {
    const s = buildSupervisionAlerts({
      source: "gsc",
      khoaScope: [{ id: "a", label: "Khoa A" }],
      matrixKhoa: [{ id: "a", ten: "Khoa A", tong_quan_sat: 200, tong_dat: 170, ty_le_tuan_thu: 85 }],
    });
    expect(s.duoi85).toEqual([]);
    expect(s.chuaCoPhien).toEqual([]);
  });

  it("dòng ma trận n = 0 tính là chưa có phiên", () => {
    const s = buildSupervisionAlerts({
      source: "vst",
      khoaScope: [{ id: "a", label: "Khoa A" }],
      matrixKhoa: [{ id: "a", ten: "Khoa A", tong_co_hoi: 0, da_tuan_thu: 0 }],
    });
    expect(s.chuaCoPhien.map((x) => x.ten)).toEqual(["Khoa A"]);
  });
});
