import { describe, expect, it } from "vitest";
import { assertQlcvHardDeleteAllowed, canQlcvHardDelete } from "./qlcv-hard-delete";

describe("canQlcvHardDelete", () => {
  it("đề xuất chưa duyệt → OK", () => {
    expect(canQlcvHardDelete({ trang_thai: "MOI", is_active: false })).toBe(true);
  });

  it("HOAN_THANH / CHO_DUYET → không", () => {
    expect(canQlcvHardDelete({ trang_thai: "HOAN_THANH", is_active: true })).toBe(false);
    expect(canQlcvHardDelete({ trang_thai: "CHO_DUYET", is_active: true, phan_tram_hoan_thanh: 100 })).toBe(
      false,
    );
  });

  it("MOI %0 nhật ký trống → OK", () => {
    expect(
      canQlcvHardDelete({ trang_thai: "MOI", is_active: true, phan_tram_hoan_thanh: 0, nhat_ky: [] }),
    ).toBe(true);
  });

  it("DANG_LAM % > 0 → không", () => {
    expect(
      canQlcvHardDelete({ trang_thai: "DANG_LAM", is_active: true, phan_tram_hoan_thanh: 10 }),
    ).toBe(false);
  });

  it("assert báo Dùng Hủy", () => {
    expect(() => assertQlcvHardDeleteAllowed({ trang_thai: "HOAN_THANH", is_active: true })).toThrow(
      /Hủy/i,
    );
  });
});
