import { describe, expect, it } from "vitest";
import { duocDuyetYeuCauVst, quyetDinhDuongDieuChinhVst } from "./vst-yeu-cau-dieu-chinh";

// @dac-ta T1.33
describe("quyetDinhDuongDieuChinhVst (R1.24)", () => {
  const base = { adminBypass: false, laChuPhien: true, quaHan: false, laCanBoKsnk: false };

  it("chủ phiên trong 30 phút: sửa/xóa trực tiếp", () => {
    expect(quyetDinhDuongDieuChinhVst(base)).toBe("TRUC_TIEP");
  });

  it("chủ phiên quá 30 phút: phải qua yêu cầu chờ duyệt", () => {
    expect(quyetDinhDuongDieuChinhVst({ ...base, quaHan: true })).toBe("YEU_CAU");
  });

  it("cán bộ KSNK không phải chủ phiên: phải qua yêu cầu chờ duyệt", () => {
    expect(quyetDinhDuongDieuChinhVst({ ...base, laChuPhien: false, laCanBoKsnk: true })).toBe("YEU_CAU");
  });

  it("người khác, không phải cán bộ KSNK: từ chối", () => {
    expect(quyetDinhDuongDieuChinhVst({ ...base, laChuPhien: false, quaHan: true })).toBe("TU_CHOI");
  });

  it("ADMIN giữ đường trực tiếp", () => {
    expect(quyetDinhDuongDieuChinhVst({ ...base, adminBypass: true, laChuPhien: false, quaHan: true })).toBe("TRUC_TIEP");
  });
});

describe("duocDuyetYeuCauVst", () => {
  it("không tự duyệt yêu cầu của chính mình", () => {
    expect(duocDuyetYeuCauVst({ nguoiDuyetAuthId: "u-1", nguoiYeuCauAuthId: "u-1", laAdmin: false })).toBe(false);
  });
  it("người khác duyệt được", () => {
    expect(duocDuyetYeuCauVst({ nguoiDuyetAuthId: "u-2", nguoiYeuCauAuthId: "u-1", laAdmin: false })).toBe(true);
  });
  it("ADMIN được miễn (cùng mẫu QLCV-010)", () => {
    expect(duocDuyetYeuCauVst({ nguoiDuyetAuthId: "u-1", nguoiYeuCauAuthId: "u-1", laAdmin: true })).toBe(true);
  });
  it("thiếu danh tính người duyệt: chặn", () => {
    expect(duocDuyetYeuCauVst({ nguoiDuyetAuthId: null, nguoiYeuCauAuthId: "u-1", laAdmin: false })).toBe(false);
  });
});
