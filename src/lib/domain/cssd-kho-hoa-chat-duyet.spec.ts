import { describe, expect, it } from "vitest";
import { canShowDuyetButtons, normalizeTrangThai, trangThaiLabel, validateLyDoTuChoi } from "./cssd-kho-hoa-chat-duyet";

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
