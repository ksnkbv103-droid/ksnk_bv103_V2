import { describe, expect, it } from "vitest";
import {
  coVaiTroCanBoKsnk,
  duocDuyetYeuCauVst,
  quyetDinhDuongDieuChinhVst,
  quyetDinhSuaVst,
} from "./vst-yeu-cau-dieu-chinh";

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

// @dac-ta T1.33 — VST-027
describe("quyetDinhSuaVst (R1.24)", () => {
  const base = { adminBypass: false, laChuPhien: false, quaHan: false, laCanBoKsnk: true };

  it("CB_KSNK sửa phiên người khác, chưa quá hạn: vẫn gửi yêu cầu và bắt lý do", () => {
    expect(quyetDinhSuaVst(base)).toEqual({ duong: "YEU_CAU", guiYeuCau: true, canLyDo: true });
  });
  it("chủ phiên trong 30 phút: ghi thẳng, không cần lý do", () => {
    expect(quyetDinhSuaVst({ ...base, laChuPhien: true, laCanBoKsnk: false })).toEqual({
      duong: "TRUC_TIEP",
      guiYeuCau: false,
      canLyDo: false,
    });
  });
  it("chủ phiên quá hạn: yêu cầu + lý do", () => {
    expect(quyetDinhSuaVst({ ...base, laChuPhien: true, laCanBoKsnk: false, quaHan: true })).toEqual({
      duong: "YEU_CAU",
      guiYeuCau: true,
      canLyDo: true,
    });
  });
  it("ADMIN quá hạn: ghi thẳng nhưng vẫn bắt lý do", () => {
    expect(quyetDinhSuaVst({ ...base, adminBypass: true, quaHan: true })).toEqual({
      duong: "TRUC_TIEP",
      guiYeuCau: false,
      canLyDo: true,
    });
  });
  it("người khác, không phải CB_KSNK: từ chối, không đòi lý do", () => {
    expect(quyetDinhSuaVst({ ...base, laCanBoKsnk: false, quaHan: true })).toEqual({
      duong: "TU_CHOI",
      guiYeuCau: false,
      canLyDo: false,
    });
  });
});

describe("coVaiTroCanBoKsnk", () => {
  it("NHAN_VIEN_KSNK và CHU_NHIEM_KHOA là CB_KSNK", () => {
    expect(coVaiTroCanBoKsnk(["NHAN_VIEN_KSNK"])).toBe(true);
    expect(coVaiTroCanBoKsnk(["X", "CHU_NHIEM_KHOA"])).toBe(true);
  });
  it("vai khác hoặc rỗng: không", () => {
    expect(coVaiTroCanBoKsnk(["MANG_LUOI_KSNK", "ADMIN"])).toBe(false);
    expect(coVaiTroCanBoKsnk([])).toBe(false);
  });
});
