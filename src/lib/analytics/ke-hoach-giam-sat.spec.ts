import { describe, expect, it } from "vitest";
import { sortKeHoachTheoTenKhoa, summarizeKeHoach, toThangDauThang } from "./ke-hoach-giam-sat";

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

describe("sortKeHoachTheoTenKhoa — VST-033", () => {
  const r = (khoa_id: string) => ({ khoa_id, chi_tieu: 1, so_phien: 0, ty_le_hoan_thanh: 0, dat: false });
  const ten = new Map([
    ["f-uuid", "Khoa Nội A"],
    ["0-uuid", "Khoa Ngoại B"],
    ["a-uuid", "Khoa Cấp cứu"],
  ]);

  it("xếp theo tên khoa (tiếng Việt), không theo khoa_id", () => {
    const out = sortKeHoachTheoTenKhoa([r("0-uuid"), r("a-uuid"), r("f-uuid")], ten);
    expect(out.map((x) => ten.get(x.khoa_id))).toEqual(["Khoa Cấp cứu", "Khoa Ngoại B", "Khoa Nội A"]);
  });

  it("ổn định bất kể thứ tự vào; khoa không có tên xuống cuối; không sửa mảng gốc", () => {
    const vao = [r("f-uuid"), r("zz-khong-ten"), r("0-uuid"), r("a-uuid")];
    const a = sortKeHoachTheoTenKhoa(vao, ten).map((x) => x.khoa_id);
    const b = sortKeHoachTheoTenKhoa([...vao].reverse(), ten).map((x) => x.khoa_id);
    expect(a).toEqual(b);
    expect(a[a.length - 1]).toBe("zz-khong-ten");
    expect(vao[0].khoa_id).toBe("f-uuid");
  });
});
