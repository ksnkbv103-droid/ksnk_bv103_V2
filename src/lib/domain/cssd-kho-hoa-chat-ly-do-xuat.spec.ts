import { describe, expect, it } from "vitest";
import { canXuatLoQuaHan, isLyDoXuat, lyDoXuatLabel, validateLyDoXuat } from "./cssd-kho-hoa-chat-ly-do-xuat";

describe("cssd-kho-hoa-chat-ly-do-xuat", () => {
  it("nhận diện lý do hợp lệ", () => {
    expect(isLyDoXuat("VO_HONG")).toBe(true);
    expect(isLyDoXuat("KHAC")).toBe(false);
    expect(lyDoXuatLabel("CAP_SU_DUNG")).toBe("Cấp sử dụng");
    expect(lyDoXuatLabel(null)).toBeNull();
  });

  it("chỉ HET_HAN_HUY được xuất lô quá hạn", () => {
    expect(canXuatLoQuaHan("HET_HAN_HUY")).toBe(true);
    expect(canXuatLoQuaHan("CAP_SU_DUNG")).toBe(false);
  });

  it("validate lý do theo tình trạng lô", () => {
    expect(validateLyDoXuat("", false)).toBe("Chọn lý do xuất.");
    expect(validateLyDoXuat("CAP_SU_DUNG", false)).toBeNull();
    expect(validateLyDoXuat("HET_HAN_HUY", true)).toBeNull();
    expect(validateLyDoXuat("HET_HAN_HUY", false)).toMatch(/đã quá hạn/);
    expect(validateLyDoXuat("VO_HONG", true)).toMatch(/Hết hạn, hủy/);
  });
});
