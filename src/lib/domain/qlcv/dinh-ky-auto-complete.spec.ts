import { describe, expect, it } from "vitest";
import { isQlcvLoaiDinhKy, shouldAutoHoanThanhDinhKy } from "./dinh-ky-auto-complete";

describe("shouldAutoHoanThanhDinhKy", () => {
  it("đóng khi định kỳ đủ 100%", () => {
    expect(shouldAutoHoanThanhDinhKy({ loai_cong_viec: "DINH_KY", phan_tram: 100 })).toBe(true);
  });

  it("chưa đóng khi định kỳ dưới 100%", () => {
    expect(shouldAutoHoanThanhDinhKy({ loai_cong_viec: "DINH_KY", phan_tram: 99 })).toBe(false);
  });

  it("không tự đóng việc đột xuất / khẩn", () => {
    expect(shouldAutoHoanThanhDinhKy({ loai_cong_viec: "DOT_XUAT", phan_tram: 100 })).toBe(false);
    expect(shouldAutoHoanThanhDinhKy({ loai_cong_viec: "KHAN_CAP", phan_tram: 100 })).toBe(false);
  });

  it("isQlcvLoaiDinhKy", () => {
    expect(isQlcvLoaiDinhKy("DINH_KY")).toBe(true);
    expect(isQlcvLoaiDinhKy("DOT_XUAT")).toBe(false);
  });
});
