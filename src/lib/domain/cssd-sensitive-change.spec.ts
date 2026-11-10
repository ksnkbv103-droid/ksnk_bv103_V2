import { describe, expect, it } from "vitest";
import { detectHoaChatSensitiveChange, detectThietBiSensitiveChange } from "./cssd-sensitive-change";

describe("detectHoaChatSensitiveChange", () => {
  const prev = { is_active: true, nong_do: "2%", nguong_ton_toi_thieu: "10", ty_le_canh_bao_pct: 20, so_ngay_cho_hang: 7 };
  it("thêm mới là nhạy cảm", () => {
    expect(detectHoaChatSensitiveChange(null, {})).toEqual(["thêm hóa chất mới"]);
  });
  it("đổi tên/ghi chú (không gửi trường nhạy cảm) là trực tiếp", () => {
    expect(detectHoaChatSensitiveChange(prev, { is_active: true, nong_do: "2%", nguong_ton_toi_thieu: 10 })).toEqual([]);
  });
  it("trường không gửi = giữ nguyên", () => {
    expect(detectHoaChatSensitiveChange(prev, { is_active: true })).toEqual([]);
  });
  it("đổi nồng độ, định mức, ngừng dùng bị bắt", () => {
    const r = detectHoaChatSensitiveChange(prev, { is_active: false, nong_do: "5%", nguong_ton_toi_thieu: 3 });
    expect(r).toEqual(["ngừng sử dụng hóa chất", "nồng độ", "định mức tồn tối thiểu"]);
  });
  it("xóa định mức (null) là đổi", () => {
    expect(detectHoaChatSensitiveChange(prev, { so_ngay_cho_hang: null })).toEqual(["số ngày chờ hàng"]);
  });
});

describe("detectThietBiSensitiveChange", () => {
  it("thêm mới / ngừng bị bắt, đổi khác thì không", () => {
    expect(detectThietBiSensitiveChange(null, {})).toEqual(["thêm thiết bị mới"]);
    expect(detectThietBiSensitiveChange({ is_active: true }, { is_active: false })).toEqual(["ngừng hoạt động thiết bị"]);
    expect(detectThietBiSensitiveChange({ is_active: true }, { is_active: true })).toEqual([]);
  });
});
