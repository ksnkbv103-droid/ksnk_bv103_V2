import { describe, expect, it } from "vitest";
import {
  canShowDuyetButtons,
  canShowLapPhieuNguoc,
  coPhieuNguocHieuLuc,
  normalizeTrangThai,
  trangThaiLabel,
  validateLyDoPhieuNguoc,
  validateLyDoTuChoi,
} from "./cssd-kho-hoa-chat-duyet";

describe("CSSD-034 phiếu ngược (lát B)", () => {
  const ok = { loai: "XUAT", trangThai: "DA_DUYET", phieuGocId: null, canEdit: true, coPhieuNguocHieuLuc: false };
  it("hiện nút chỉ cho phiếu XUẤT đã duyệt, chưa là ngược, chưa có ngược hiệu lực, có quyền sửa", () => {
    expect(canShowLapPhieuNguoc(ok)).toBe(true);
    expect(canShowLapPhieuNguoc({ ...ok, loai: "NHAP" })).toBe(false);
    expect(canShowLapPhieuNguoc({ ...ok, loai: "XUAT_KHO" })).toBe(false);
    expect(canShowLapPhieuNguoc({ ...ok, trangThai: "CHO_DUYET" })).toBe(false);
    expect(canShowLapPhieuNguoc({ ...ok, trangThai: "TU_CHOI" })).toBe(false);
    expect(canShowLapPhieuNguoc({ ...ok, phieuGocId: "g1" })).toBe(false);
    expect(canShowLapPhieuNguoc({ ...ok, coPhieuNguocHieuLuc: true })).toBe(false);
    expect(canShowLapPhieuNguoc({ ...ok, canEdit: false })).toBe(false);
  });
  it("phiếu ngược hiệu lực = trỏ về phiếu gốc và chưa bị từ chối", () => {
    const movs = [
      { id: "n1", phieu_goc_id: "x1", trang_thai: "TU_CHOI" as const },
      { id: "n2", phieu_goc_id: "x2", trang_thai: "CHO_DUYET" as const },
      { id: "n3", phieu_goc_id: "x3", trang_thai: "DA_DUYET" as const },
      { id: "x4", phieu_goc_id: null, trang_thai: "DA_DUYET" as const },
    ];
    expect(coPhieuNguocHieuLuc(movs, "x1")).toBe(false);
    expect(coPhieuNguocHieuLuc(movs, "x2")).toBe(true);
    expect(coPhieuNguocHieuLuc(movs, "x3")).toBe(true);
    expect(coPhieuNguocHieuLuc(movs, "x4")).toBe(false);
  });
  it("lý do bắt buộc 1..500 ký tự sau khi cắt khoảng trắng", () => {
    expect(validateLyDoPhieuNguoc("   ")).toBe("Nhập lý do lập phiếu ngược.");
    expect(validateLyDoPhieuNguoc(null)).toBe("Nhập lý do lập phiếu ngược.");
    expect(validateLyDoPhieuNguoc("Xuất nhầm lô")).toBeNull();
    expect(validateLyDoPhieuNguoc("a".repeat(500))).toBeNull();
    expect(validateLyDoPhieuNguoc("a".repeat(501))).toBe("Lý do tối đa 500 ký tự.");
  });
});

describe("cssd-kho-hoa-chat-duyet", () => {
  it("nhãn trạng thái, mặc định Đã duyệt", () => {
    expect(trangThaiLabel("CHO_DUYET")).toBe("Chờ duyệt");
    expect(trangThaiLabel("TU_CHOI")).toBe("Từ chối");
    expect(trangThaiLabel("DA_DUYET")).toBe("Đã duyệt");
    expect(normalizeTrangThai(null)).toBe("DA_DUYET");
  });
  it("chỉ hiện nút khi chờ duyệt và có quyền", () => {
    expect(canShowDuyetButtons({ trangThai: "CHO_DUYET", canApprove: true })).toBe(true);
    expect(canShowDuyetButtons({ trangThai: "CHO_DUYET", canApprove: false })).toBe(false);
    expect(canShowDuyetButtons({ trangThai: "DA_DUYET", canApprove: true })).toBe(false);
    expect(canShowDuyetButtons({ trangThai: "TU_CHOI", canApprove: true })).toBe(false);
  });
  it("từ chối bắt buộc lý do", () => {
    expect(validateLyDoTuChoi("TU_CHOI", "  ")).toBe("Nhập lý do từ chối.");
    expect(validateLyDoTuChoi("TU_CHOI", "Sai số lượng")).toBeNull();
    expect(validateLyDoTuChoi("DUYET", "")).toBeNull();
  });
});
