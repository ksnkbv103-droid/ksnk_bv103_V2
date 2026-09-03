import { describe, expect, it } from "vitest";
import { isEligibleForNghiemThu } from "./nghiem-thu-gate";

describe("isEligibleForNghiemThu", () => {
  it("allows CHO_DUYET", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "CHO_DUYET", phan_tram_hoan_thanh: 100 })).toBe(true);
  });

  it("allows DANG_LAM at 100%", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 100 })).toBe(true);
  });

  it("rejects DANG_LAM below 100%", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "DANG_LAM", phan_tram_hoan_thanh: 50 })).toBe(false);
  });

  it("mã QUA_HAN @100% vẫn được — alias đang làm, không phải cổng riêng", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "QUA_HAN", phan_tram_hoan_thanh: 100 })).toBe(true);
  });

  it("DANG_LAM @100% + hạn đã qua — quá hạn theo hạn, không cần mã QUA_HAN", () => {
    expect(
      isEligibleForNghiemThu({
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 100,
        han_hoan_thanh: "2020-01-01",
      }),
    ).toBe(true);
  });

  it("TU_CHOI @100% + cờ quá hạn — phiếu mở + hạn/cờ, không phụ thuộc mã QUA_HAN", () => {
    expect(
      isEligibleForNghiemThu({
        trang_thai: "TU_CHOI",
        phan_tram_hoan_thanh: 100,
        is_qua_han: true,
      }),
    ).toBe(true);
  });

  it("TU_CHOI @100% chưa quá hạn — chưa vào cổng", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "TU_CHOI", phan_tram_hoan_thanh: 100 })).toBe(false);
  });

  it("maps legacy alias CHO_XAC_NHAN_HOAN_THANH", () => {
    expect(isEligibleForNghiemThu({ trang_thai: "CHO_XAC_NHAN_HOAN_THANH", phan_tram_hoan_thanh: 0 })).toBe(
      true,
    );
  });

  it("rejects việc định kỳ — tick đủ là đóng, không nghiệm thu", () => {
    expect(
      isEligibleForNghiemThu({
        trang_thai: "CHO_DUYET",
        phan_tram_hoan_thanh: 100,
        loai_cong_viec: "DINH_KY",
      }),
    ).toBe(false);
    expect(
      isEligibleForNghiemThu({
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 100,
        loai_cong_viec: "DINH_KY",
      }),
    ).toBe(false);
    expect(
      isEligibleForNghiemThu({
        trang_thai: "DANG_LAM",
        phan_tram_hoan_thanh: 100,
        loai_cong_viec: "DINH_KY",
        is_qua_han: true,
      }),
    ).toBe(false);
  });
});
