import { describe, expect, it } from "vitest";
import {
  aggregateLensRates,
  buildVeSinhTayHub,
  countWhoOpportunities,
  doLechLens,
  formatPctOrDash,
  rankTopLoi,
  tyLeBk,
  tyLeBkFromCounts,
  tyLeVst,
  tyLeVstKyThuat,
  tyLeVstNgoaiKhoa,
} from "./bao-cao-pct";

describe("bao-cao-pct SSOT", () => {
  it("WHO: tử/mẫu, bỏ ô trống và không quan sát, round 1 chữ số", () => {
    const counted = countWhoOpportunities([
      { hanh_dong: "Rửa tay bằng nước" },
      { hanh_dong: "Chà tay bằng cồn" },
      { hanh_dong: "Bỏ sót" },
      { hanh_dong: null },
      { hanh_dong: "" },
      { hanh_dong: "không quan sát" },
    ]);
    expect(counted).toEqual({ so_tuan_thu: 2, tong_co_hoi: 3 });
    const rate = tyLeVst(counted.so_tuan_thu, counted.tong_co_hoi);
    expect(rate.ty_le_vst).toBe(66.7);
    expect(tyLeVst(2, 3).ty_le_vst).toBe(66.7);
  });

  it("WHO n = 0 → null và «—»", () => {
    const rate = tyLeVst(0, 0);
    expect(rate.ty_le_vst).toBeNull();
    expect(formatPctOrDash(rate.ty_le_vst, rate.tong_co_hoi)).toBe("—");
  });

  it("BK: n_dat/(n_dat+n_kd), NA không vào tử/mẫu, ≡ ty_le_gsc và ty_le_bm", () => {
    const bk = tyLeBk(2, 1);
    expect(bk.n_ap_dung).toBe(3);
    expect(bk.ty_le_bk).toBe(66.7);
    expect(bk.ty_le_gsc).toBe(bk.ty_le_bk);
    expect(bk.ty_le_bm).toBe(bk.ty_le_bk);
    expect(tyLeBk(0, 0).ty_le_bk).toBeNull();
    expect(formatPctOrDash(null, 0)).toBe("—");
  });

  it("counts: mẫu = n_dat + n_kd, không dùng quan sát đã cộng NA", () => {
    const fromKd = tyLeBkFromCounts(2, 10, 1);
    expect(fromKd.n_ap_dung).toBe(3);
    expect(fromKd.ty_le_bk).toBe(66.7);
  });

  it("BM.02 và BM.03 dùng engine BK, không phải mẫu WHO", () => {
    expect(tyLeVstKyThuat(8, 2).ty_le_vst_ky_thuat).toBe(80);
    expect(tyLeVstNgoaiKhoa(1, 1).ty_le_vst_ngoai_khoa).toBe(50);
    expect(tyLeVstKyThuat(8, 2).ty_le_bk).toBe(tyLeBk(8, 2).ty_le_bk);
  });

  it("do_lech = tgs − ksnk chỉ khi cả hai mẫu > 0; Chéo không vào", () => {
    expect(doLechLens(80, 70, 10, 8)).toBe(10);
    expect(doLechLens(66.7, 33.3, 3, 3)).toBe(33.4);
    expect(doLechLens(80, null, 10, 0)).toBeNull();
    expect(doLechLens(80, 70, 10, 0)).toBeNull();
    const lenses = aggregateLensRates(
      [
        { ten: "Tự giám sát", tong_dat: 8, tong_quan_sat: 10, tong_vi_pham: 2 },
        { ten: "Giám sát chuyên trách", tong_dat: 5, tong_quan_sat: 10, tong_vi_pham: 5 },
        { ten: "Giám sát chéo", tong_dat: 1, tong_quan_sat: 2, tong_vi_pham: 1 },
        { ten: "Trực tiếp", tong_dat: 9, tong_quan_sat: 10, tong_vi_pham: 1 },
      ],
      "bk",
    );
    expect(lenses.tgs.ty_le).toBe(80);
    expect(lenses.ksnk.ty_le).toBe(50);
    expect(lenses.cheo.ty_le).toBe(50);
    expect(lenses.do_lech).toBe(30);
    expect(lenses.tgs.n_ap_dung).toBe(10);
  });

  it("top lỗi: bỏ NA và Đạt, min-N 5, rank n_loi rồi ty_le_loi", () => {
    const ranked = rankTopLoi([
      { id: "na", ten: "NA", n_loi: 9, n_ap_dung: 10, ket_qua: "NA" },
      { id: "dat", ten: "Đạt", n_loi: 0, n_ap_dung: 10, ket_qua: "DAT" },
      { id: "thin", ten: "Ít mẫu", n_loi: 3, n_ap_dung: 4, ket_qua: "KHONG_DAT" },
      { id: "a", ten: "A", n_loi: 4, n_ap_dung: 10, ket_qua: "KHONG_DAT" },
      { id: "b", ten: "B", n_loi: 4, n_ap_dung: 5, ket_qua: "KHONG_DAT" },
      { id: "c", ten: "C", n_loi: 6, n_ap_dung: 20, ket_qua: "KHONG_DAT" },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(ranked[1]?.ty_le_loi).toBe(80);
    expect(ranked[2]?.ty_le_loi).toBe(40);
  });

  it("hub 3 KPI cạnh nhau, không field gộp WHO+BK", () => {
    const hub = buildVeSinhTayHub({
      so_tuan_thu: 8,
      tong_co_hoi: 10,
      ky_thuat: { n_dat: 3, n_kd: 1 },
      ngoai_khoa: null,
    });
    expect(Object.keys(hub).sort()).toEqual(["ky_thuat", "ngoai_khoa", "who"]);
    expect(hub.who.ty_le_vst).toBe(80);
    expect(hub.ky_thuat.ty_le_vst_ky_thuat).toBe(75);
    expect(hub.ngoai_khoa.display).toBe("—");
    expect(hub.ngoai_khoa.ty_le_vst_ngoai_khoa).toBeNull();
    expect("ty_le_vst_gop" in hub).toBe(false);
  });
});
