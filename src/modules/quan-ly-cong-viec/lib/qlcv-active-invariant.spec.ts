import { describe, expect, it } from "vitest";
import { assertQlcvActiveInvariant } from "./qlcv-active-invariant";

describe("assertQlcvActiveInvariant", () => {
  it("OK khi đủ tiêu đề + phụ trách + hạn", () => {
    expect(() =>
      assertQlcvActiveInvariant({
        tieu_de: "Việc A",
        nguoi_phu_trach_id: "ns-1",
        han_hoan_thanh: "2026-10-10",
        loai_cong_viec: "DOT_XUAT",
      }),
    ).not.toThrow();
  });

  it("thiếu phụ trách", () => {
    expect(() =>
      assertQlcvActiveInvariant({
        tieu_de: "Việc A",
        nguoi_phu_trach_id: null,
        han_hoan_thanh: "2026-10-10",
      }),
    ).toThrow(/phụ trách/i);
  });

  it("DOT thiếu hạn", () => {
    expect(() =>
      assertQlcvActiveInvariant({
        tieu_de: "Việc A",
        nguoi_phu_trach_id: "ns-1",
        han_hoan_thanh: null,
        loai_cong_viec: "DOT_XUAT",
      }),
    ).toThrow(/Hạn/i);
  });

  it("DINH_KY không được xóa hạn", () => {
    expect(() =>
      assertQlcvActiveInvariant({
        tieu_de: "Việc A",
        nguoi_phu_trach_id: "ns-1",
        han_hoan_thanh: null,
        loai_cong_viec: "DINH_KY",
      }),
    ).toThrow(/định kỳ/i);
  });
});
