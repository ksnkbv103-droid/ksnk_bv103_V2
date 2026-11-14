import { describe, expect, it } from "vitest";
import { kiemThamSoNhap } from "./tham-so-nhap";

const HOM_NAY = "2026-11-14";
const ok = { maThamSo: "vst.khoa_do_pct", giaTri: "88", hieuLucTu: "2026-12-01", nguon: "QĐ 123/BV103" };

describe("kiemThamSoNhap", () => {
  it("dòng hợp lệ: trả đúng cột DB", () => {
    expect(kiemThamSoNhap(ok, HOM_NAY)).toEqual({
      ok: true,
      row: { ma_tham_so: "vst.khoa_do_pct", gia_tri: 88, hieu_luc_tu: "2026-12-01", nguon: "QĐ 123/BV103" },
    });
  });
  it("hiệu lực từ hôm nay: nhận", () => {
    expect(kiemThamSoNhap({ ...ok, hieuLucTu: HOM_NAY }, HOM_NAY).ok).toBe(true);
  });
  it.each([
    ["mã lạ", { ...ok, maThamSo: "vst.la" }],
    ["giá trị rỗng", { ...ok, giaTri: "" }],
    ["giá trị chữ", { ...ok, giaTri: "abc" }],
    ["% trên 100", { ...ok, giaTri: 101 }],
    ["% âm", { ...ok, giaTri: -1 }],
    ["cỡ mẫu lẻ", { ...ok, maThamSo: "vst.so_sanh_mau_toi_thieu", giaTri: 20.5 }],
    ["cỡ mẫu 0", { ...ok, maThamSo: "doi_soat.gsc_mau_toi_thieu", giaTri: 0 }],
    ["ngày lùi", { ...ok, hieuLucTu: "2026-11-13" }],
    ["ngày sai dạng", { ...ok, hieuLucTu: "01/12/2026" }],
    ["thiếu nguồn", { ...ok, nguon: "abc" }],
  ])("chặn: %s", (_ten, input) => {
    expect(kiemThamSoNhap(input, HOM_NAY).ok).toBe(false);
  });
});
