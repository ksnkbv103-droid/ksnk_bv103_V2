import { describe, expect, it } from "vitest";
import { sortKhoaLamSangTruoc } from "./vst-khoa-order";

describe("VST-013a: xếp khoa lâm sàng lên trước", () => {
  const khoi = [
    { id: "k-coquan", ma: "KCOQUAN" },
    { id: "k-cls", ma: "KCLS" },
    { id: "k-ngoai", ma: "KNGOAI" },
    { id: "k-noi", ma: "KNOI" },
  ];
  const khoas = [
    { id: "1", ten_khoa: "Phòng Hành chính", khoi_id: "k-coquan" },
    { id: "2", ten_khoa: "Khoa Xét nghiệm", khoi_id: "k-cls" },
    { id: "3", ten_khoa: "Khoa Ngoại chung", khoi_id: "k-ngoai" },
    { id: "4", ten_khoa: "Khoa Chưa phân khối", khoi_id: null },
    { id: "5", ten_khoa: "Khoa Hồi sức", khoi_id: "k-noi" },
    { id: "6", ten_khoa: "Khoa A Nội", khoi_id: "k-noi" },
  ];

  it("Nội → Ngoại → Cận lâm sàng → Cơ quan → chưa phân khối; trong khối giữ thứ tự gốc", () => {
    expect(sortKhoaLamSangTruoc(khoas, khoi).map((k) => k.id)).toEqual(["5", "6", "3", "2", "1", "4"]);
  });

  it("không có danh mục khối thì giữ nguyên thứ tự", () => {
    expect(sortKhoaLamSangTruoc(khoas, []).map((k) => k.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
});
