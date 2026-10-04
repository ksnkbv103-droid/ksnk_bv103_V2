import { describe, expect, it } from "vitest";
import { inferDoiTuongGiamSatFromTopic } from "./gsc-doi-tuong-from-topic";

describe("inferDoiTuongGiamSatFromTopic GSC-04", () => {
  it("gói → NGUOI_BENH", () => {
    expect(inferDoiTuongGiamSatFromTopic({ ma_bk: "KSNK.QT.32.BM.01", ten_bang_kiem: "VAP bundle" })).toBe(
      "NGUOI_BENH",
    );
    expect(inferDoiTuongGiamSatFromTopic({ ma_bk: "BM.26.01" })).toBe("NGUOI_BENH");
  });

  it("VSMT / đồ vải → MOI_TRUONG", () => {
    expect(inferDoiTuongGiamSatFromTopic({ ma_bk: "BM.11.01", ten_bang_kiem: "VSMT khoa" })).toBe(
      "MOI_TRUONG",
    );
  });

  it("CSSD / mẻ → THIET_BI hoặc ME_TIET_KHUAN", () => {
    expect(inferDoiTuongGiamSatFromTopic({ ma_bk: "KSNK.QT.20.BM.01", ten_bang_kiem: "Đóng gói dụng cụ" })).toBe(
      "THIET_BI",
    );
    expect(inferDoiTuongGiamSatFromTopic({ ten_bang_kiem: "QC mẻ tiệt khuẩn BI" })).toBe("ME_TIET_KHUAN");
  });

  it("còn lại → NHAN_VIEN", () => {
    expect(inferDoiTuongGiamSatFromTopic({ ma_bk: "KSNK.QT.07.BM.03", ten_bang_kiem: "VST ngoại khoa" })).toBe(
      "NHAN_VIEN",
    );
  });
});
