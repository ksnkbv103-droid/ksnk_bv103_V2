import { describe, expect, it } from "vitest";
import { summarizeKeHoach, toThangDauThang } from "./ke-hoach-giam-sat";

describe("toThangDauThang", () => {
  it("chuẩn hóa về ngày đầu tháng", () => {
    expect(toThangDauThang("2026-11-17")).toBe("2026-11-01");
    expect(toThangDauThang("2026-02-28T10:00:00Z")).toBe("2026-02-01");
  });
  it("không hợp lệ → null", () => {
    expect(toThangDauThang("")).toBeNull();
    expect(toThangDauThang("2026-13-01")).toBeNull();
    expect(toThangDauThang(undefined)).toBeNull();
  });
});

describe("summarizeKeHoach", () => {
  it("đếm đạt/chưa", () => {
    const r = (dat: boolean) => ({ khoa_id: "k", chi_tieu: 1, so_phien: dat ? 1 : 0, ty_le_hoan_thanh: 0, dat });
    expect(summarizeKeHoach([r(true), r(false), r(false)])).toEqual({ tong: 3, dat: 1, chua: 2 });
    expect(summarizeKeHoach([])).toEqual({ tong: 0, dat: 0, chua: 0 });
  });
});
