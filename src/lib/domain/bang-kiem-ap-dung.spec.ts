import { describe, expect, it } from "vitest";
import {
  computePhienToiThieuTrongKy,
  countKyTanSuatTrongKhoang,
  derivePhamVi,
  describeNghiaVuChoKhoa,
  evaluateTanSuatTrongKy,
  formatTanSuatToiThieu,
  isBkBatBuocTgsChoKhoa,
  listBkTuGiamSatChoKhoa,
  listKhoaTrongPhamVi,
  needsApDungKhoaConfiguration,
  normalizeApDungForSave,
  parseApDungJsonb,
  resolveBkApDungChoKhoa,
  validateApDungForSave,
} from "./bang-kiem-ap-dung";

const K1 = "11111111-1111-1111-1111-111111111101";
const K2 = "11111111-1111-1111-1111-111111111102";
const K3 = "11111111-1111-1111-1111-111111111103";
const KH1 = "22222222-2222-2222-2222-222222222201";
const KH2 = "22222222-2222-2222-2222-222222222202";

const khoaNgoai = { id: K1, khoi_id: KH1, ma_khoa: "NGOAI", ten_khoa: "Khoa Ngoại", is_active: true };
const khoaKsnk = { id: K2, khoi_id: KH1, ma_khoa: "KSNK", ten_khoa: "KSNK", is_active: true };
const khoaNoi = { id: K3, khoi_id: KH2, ma_khoa: "NOI", ten_khoa: "Khoa Nội", is_active: true };

describe("bang-kiem-ap-dung", () => {
  it("CA_VIEN + loại trừ KSNK (legacy)", () => {
    const bk = {
      id: "b1",
      ap_dung_jsonb: {
        pham_vi: "CA_VIEN",
        khoi_ids: [],
        khoa_ids: [],
        khoa_loai_tru: [K2],
        bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
        muc_do: "BAT_BUOC",
      },
    };
    expect(resolveBkApDungChoKhoa(bk, khoaNgoai)).toBe(true);
    expect(resolveBkApDungChoKhoa(bk, khoaKsnk)).toBe(false);
  });

  it("lớp khối + khoa (giao)", () => {
    const ap = normalizeApDungForSave({
      pham_vi: "CA_VIEN",
      khoi_ids: [KH1],
      khoa_ids: [K1],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: false },
      muc_do: "BAT_BUOC",
    });
    expect(derivePhamVi(ap)).toBe("THEO_KHOA");
    expect(resolveBkApDungChoKhoa({ ap_dung_jsonb: ap }, khoaNgoai)).toBe(true);
    expect(resolveBkApDungChoKhoa({ ap_dung_jsonb: ap }, khoaNoi)).toBe(false);
  });

  it("CHI_KSNK chỉ Khoa KSNK", () => {
    const ap = normalizeApDungForSave({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: true },
      muc_do: "CHI_KSNK",
    });
    expect(resolveBkApDungChoKhoa({ ap_dung_jsonb: ap }, khoaKsnk)).toBe(true);
    expect(resolveBkApDungChoKhoa({ ap_dung_jsonb: ap }, khoaNgoai)).toBe(false);
    expect(isBkBatBuocTgsChoKhoa({ ap_dung_jsonb: ap, is_active: true }, khoaNgoai)).toBe(false);
  });

  it("KHUYEN_NGH không bắt buộc TGS", () => {
    const bk = {
      id: "b5",
      ap_dung_jsonb: {
        pham_vi: "KHUYEN_NGH",
        khoi_ids: [],
        khoa_ids: [],
        khoa_loai_tru: [],
        bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: false },
        muc_do: "KHUYEN_NGH",
      },
    };
    expect(resolveBkApDungChoKhoa(bk, khoaNgoai)).toBe(true);
    expect(isBkBatBuocTgsChoKhoa(bk, khoaNgoai)).toBe(false);
  });

  it("validate cần đối tượng thực hiện khi bắt buộc", () => {
    const ap = parseApDungJsonb({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: false },
      muc_do: "BAT_BUOC",
    });
    expect(validateApDungForSave(ap)).toMatch(/đối tượng/);
  });

  it("describe nghĩa vụ TGS cho mạng lưới khoa", () => {
    const ap = normalizeApDungForSave({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
      muc_do: "BAT_BUOC",
    });
    const n = describeNghiaVuChoKhoa(ap, khoaNgoai);
    expect(n.batBuocTgs).toBe(true);
    expect(n.huongDan.some((h) => h.includes("TGS"))).toBe(true);
  });

  it("listKhoaTrongPhamVi cả viện trừ miễn", () => {
    const ap = normalizeApDungForSave({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [K2],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
      muc_do: "BAT_BUOC",
    });
    const list = listKhoaTrongPhamVi(ap, [khoaNgoai, khoaKsnk, khoaNoi]);
    expect(list.map((k) => k.id).sort()).toEqual([K1, K3].sort());
  });

  it("listBkTuGiamSatChoKhoa — resolve ∧ tu_giam_sat", () => {
    const catalog = [
      {
        id: "b1",
        ap_dung_jsonb: {
          pham_vi: "CA_VIEN",
          khoi_ids: [],
          khoa_ids: [],
          khoa_loai_tru: [],
          bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
          muc_do: "BAT_BUOC",
        },
      },
      {
        id: "b2",
        ap_dung_jsonb: {
          pham_vi: "THEO_KHOA",
          khoi_ids: [],
          khoa_ids: [K3],
          khoa_loai_tru: [],
          bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: false },
          muc_do: "BAT_BUOC",
        },
      },
    ];
    expect(listBkTuGiamSatChoKhoa(catalog, khoaNgoai).map((b) => b.id)).toEqual(["b1"]);
    expect(listBkTuGiamSatChoKhoa(catalog, khoaNoi).map((b) => b.id).sort()).toEqual(["b1", "b2"].sort());
  });

  it("fallback từ metadata khi json rỗng", () => {
    const ap = parseApDungJsonb({}, { phan_loai_chuyen_mon: "CHUYEN_KHOA", loai_giam_sat: "TUAN_THU" });
    expect(ap.pham_vi).toBe("THEO_KHOA");
  });

  it("parse và format tan_suat_toi_thieu khi KSNK đã quy định", () => {
    const ap = parseApDungJsonb({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
      muc_do: "BAT_BUOC",
      tan_suat_toi_thieu: { don_vi: "THANG", so_lan: 2 },
    });
    expect(formatTanSuatToiThieu(ap)).toBe("2 phiên TGS tối thiểu / tháng");
    const n = describeNghiaVuChoKhoa(normalizeApDungForSave(ap), khoaNgoai);
    expect(n.huongDan.some((h) => h.includes("2 phiên"))).toBe(true);
  });

  it("validate THEO_KHOA không chọn khoa — T-A2", () => {
    const ap = parseApDungJsonb({
      pham_vi: "THEO_KHOA",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: false },
      muc_do: "BAT_BUOC",
    });
    expect(needsApDungKhoaConfiguration(ap)).toBe(true);
    expect(validateApDungForSave(ap)).toMatch(/khoa áp dụng/i);
  });

  it("đánh giá tần suất phiên trong kỳ", () => {
    expect(countKyTanSuatTrongKhoang("THANG", "2026-06-01", "2026-06-30")).toBe(1);
    expect(
      computePhienToiThieuTrongKy({ don_vi: "THANG", so_lan: 2 }, "2026-06-01", "2026-06-30"),
    ).toBe(2);
    expect(
      evaluateTanSuatTrongKy(
        1,
        {
          muc_do: "BAT_BUOC",
          bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
          tan_suat_toi_thieu: { don_vi: "THANG", so_lan: 2 },
        },
        "2026-06-01",
        "2026-06-30",
      ),
    ).toBe("thieu");
    expect(
      evaluateTanSuatTrongKy(
        2,
        {
          muc_do: "BAT_BUOC",
          bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
          tan_suat_toi_thieu: { don_vi: "THANG", so_lan: 2 },
        },
        "2026-06-01",
        "2026-06-30",
      ),
    ).toBe("dat");
  });

  it("normalize bỏ tan_suat khi không TGS hoặc thiếu số", () => {
    const withTgs = normalizeApDungForSave({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: true, ksnk_giam_sat: true },
      muc_do: "BAT_BUOC",
      tan_suat_toi_thieu: { don_vi: "TUAN", so_lan: 1 },
    });
    expect(withTgs.tan_suat_toi_thieu?.so_lan).toBe(1);

    const noTgs = normalizeApDungForSave({
      pham_vi: "CA_VIEN",
      khoi_ids: [],
      khoa_ids: [],
      khoa_loai_tru: [],
      bat_buoc: { tu_giam_sat: false, ksnk_giam_sat: true },
      muc_do: "BAT_BUOC",
      tan_suat_toi_thieu: { don_vi: "THANG", so_lan: 1 },
    });
    expect(noTgs.tan_suat_toi_thieu).toBeUndefined();
    expect(formatTanSuatToiThieu(noTgs)).toBeNull();
  });
});
