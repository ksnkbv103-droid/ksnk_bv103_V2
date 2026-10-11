import { describe, expect, it } from "vitest";
import {
  mergeGscSessionWithDbPrintLabels,
  resolveGscDoiTuongTen,
  resolveGscKhoaTen,
  resolveGscKhuTen,
  resolveGscNguoiGiamSatTen,
  resolveGscNgheTen,
  snapshotGscSessionForPrint,
} from "./gsc-session-labels";

describe("gsc-session-labels", () => {
  it("khoa: ưu tiên mã; thiếu mã dùng tên; không có gì -> —", () => {
    expect(resolveGscKhoaTen({ khoa_id: "k1" }, [{ id: "k1", ma_danh_muc: "A05", ten_danh_muc: "Khoa X" }])).toBe("A05");
    expect(resolveGscKhoaTen({ ten_khoa_phong: "Khoa Y" }, [])).toBe("Khoa Y");
    expect(resolveGscKhoaTen({}, [])).toBe("—");
  });
  it("khu vực: join -> tra danh mục -> —", () => {
    expect(resolveGscKhuTen({ danh_muc_khu_vuc: { ten_danh_muc: "K1" } }, [])).toBe("K1");
    expect(resolveGscKhuTen({ khu_vuc_id: "x" }, [{ id: "x", ten_danh_muc: "K2" }])).toBe("K2");
    expect(resolveGscKhuTen({}, [])).toBe("—");
  });
  it("người giám sát: join, view, tra id, trả id nếu không thấy", () => {
    expect(resolveGscNguoiGiamSatTen({ nguoi_giam_sat: { ho_ten: "A" } })).toBe("A");
    expect(resolveGscNguoiGiamSatTen({ ten_nguoi_giam_sat: "B" })).toBe("B");
    expect(resolveGscNguoiGiamSatTen({ nguoi_giam_sat_id: "1" }, [{ id: "1", ho_ten: "C" }])).toBe("C");
    expect(resolveGscNguoiGiamSatTen({ nguoi_giam_sat_id: "9" })).toBe("9");
  });
  it("đối tượng: nhập tay, join, tra id, —", () => {
    expect(resolveGscDoiTuongTen({ is_manual_nhan_vien: true, ten_manual_nhan_vien: "M" })).toBe("M");
    expect(resolveGscDoiTuongTen({ is_manual_nhan_vien: true })).toBe("—");
    expect(resolveGscDoiTuongTen({ nhan_vien: { ho_ten: "J" } })).toBe("J");
    expect(resolveGscDoiTuongTen({ nhan_vien_id: "1" }, [{ id: "1", ho_ten: "T" }])).toBe("T");
    expect(resolveGscDoiTuongTen({ nhan_vien_id: "9" })).toBe("—");
  });
  it("nghề nghiệp", () => {
    expect(resolveGscNgheTen({ nghe_nghiep_id: "n" }, [{ id: "n", ten_danh_muc: "ĐD" } as never])).toBe("ĐD");
    expect(resolveGscNgheTen({})).toBe("—");
  });
  it("merge: chỉ ghi đè nhãn không rỗng, không mutate bản gốc", () => {
    const s = { nhan_vien: { id: "1" } };
    const r = mergeGscSessionWithDbPrintLabels(s, { khoa_ten: "K", ho_ten_doi_tuong: "N", khu_ten: " " });
    expect(r.danh_muc_khoa).toEqual({ ten_danh_muc: "K" });
    expect(r.danh_muc_khu_vuc).toBeUndefined();
    expect(r.nhan_vien).toEqual({ id: "1", ho_ten: "N" });
    expect(s.nhan_vien).toEqual({ id: "1" });
  });
  it("snapshot in: giữ join, điền chỗ thiếu bằng suy ra, còn lại —", () => {
    const r = snapshotGscSessionForPrint(
      { danh_muc_khoa: { ten_danh_muc: "Khoa J" }, khu_vuc_id: "x", nguoi_giam_sat_id: "1" },
      [],
      [{ id: "x", ten_danh_muc: "Khu X" }],
      [],
      [{ id: "1", ho_ten: "GS" }],
    ) as Record<string, { ten_danh_muc?: string; ho_ten?: string }>;
    expect(r.danh_muc_khoa.ten_danh_muc).toBe("Khoa J");
    expect(r.danh_muc_khu_vuc.ten_danh_muc).toBe("Khu X");
    expect(r.nguoi_giam_sat.ho_ten).toBe("GS");
    expect(r.nhan_vien.ho_ten).toBe("—");
    expect(r.danh_muc_nghe_nghiep.ten_danh_muc).toBe("—");
  });
});
