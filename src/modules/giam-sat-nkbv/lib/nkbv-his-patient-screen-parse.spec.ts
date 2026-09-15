import { describe, expect, it } from "vitest";
import { parseHisPatientScreenText } from "./nkbv-his-patient-screen-parse";

/** Layout giống form HIS «Thông tin bệnh nhân» (nhãn cố định). */
const HIS_FIXTURE = `
Thông tin bệnh nhân
Mã BN 26149538
Tên bệnh nhân NGUYEN VAN MAU
Giới tính Nam
Ngày sinh 29/03/1977
Tuổi 49
Mã HSBA 26A05002566
Khoa phòng Khoa Truyền Nhiễm > PDT A05 > Buong 3.10
Ngày vào 11:23 13/09/2026
Ngày ra 15/09/2026
Địa chỉ Xa Mau, Ha Noi
`;

describe("parseHisPatientScreenText", () => {
  it("map Mã HSBA/BN/tên/ngày vào/khoa từ layout HIS", () => {
    const res = parseHisPatientScreenText(HIS_FIXTURE);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.row.ma_benh_an).toBe("26A05002566");
    expect(res.row.ma_benh_nhan).toBe("26149538");
    expect(res.row.ho_ten_benh_nhan).toMatch(/NGUYEN VAN MAU/i);
    expect(res.row.ngay_vao_vien).toBe("2026-09-13");
    expect(res.row.ngay_sinh).toBe("1977-03-29");
    expect(res.row.gioi_tinh).toBe("Nam");
    expect(res.row.khoa_dieu_tri).toMatch(/Truyền Nhiễm|Truyen Nhiem/i);
    expect(res.row.ngay_ra_vien).toBe("2026-09-15");
  });

  it("báo thiếu khi không có Mã HSBA", () => {
    const res = parseHisPatientScreenText("Mã BN 12345\nTên bệnh nhân A B\nNgày vào 01/01/2026");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.missing.some((m) => m.includes("ma_benh_an"))).toBe(true);
  });
});
