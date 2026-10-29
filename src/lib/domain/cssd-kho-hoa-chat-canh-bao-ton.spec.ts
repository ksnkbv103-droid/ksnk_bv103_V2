import { describe, expect, it } from "vitest";
import { tinhCanhBaoTon } from "./cssd-kho-hoa-chat-canh-bao-ton";

const base = { tong_ton: 100, nhap_30n: 0, xuat_su_dung_30n: 0, nguong_ton_toi_thieu: null };

describe("tinhCanhBaoTon", () => {
  it("tồn ≤ 20% lượng nhập 30 ngày → SAP_HET", () => {
    const r = tinhCanhBaoTon({ ...base, tong_ton: 20, nhap_30n: 100 });
    expect(r.muc).toBe("SAP_HET");
    expect(r.nguong_hieu_luc).toBe(20);
  });
  it("tồn trên ngưỡng % và chưa có số liệu xuất → OK", () => {
    expect(tinhCanhBaoTon({ ...base, tong_ton: 21, nhap_30n: 100 }).muc).toBe("OK");
  });
  it("tôn trọng % do ADMIN đặt", () => {
    expect(tinhCanhBaoTon({ ...base, tong_ton: 10, nhap_30n: 100, ty_le_canh_bao_pct: 10 }).muc).toBe("SAP_HET");
    expect(tinhCanhBaoTon({ ...base, tong_ton: 11, nhap_30n: 100, ty_le_canh_bao_pct: 10 }).muc).toBe("OK");
  });
  it("chưa có nhập 30 ngày → dùng định mức tối thiểu", () => {
    expect(tinhCanhBaoTon({ ...base, tong_ton: 5, nguong_ton_toi_thieu: 5 }).muc).toBe("SAP_HET");
    expect(tinhCanhBaoTon({ ...base, tong_ton: 6, nguong_ton_toi_thieu: 5 }).muc).toBe("OK");
  });
  it("còn dùng được ít hơn ngày chờ hàng → SAP_HET dù tồn cao", () => {
    // xuất 300/30 ngày = 10/ngày; tồn 100 → 10 ngày < 14
    const r = tinhCanhBaoTon({ ...base, tong_ton: 100, nhap_30n: 1000, xuat_su_dung_30n: 300 });
    expect(r.muc).toBe("SAP_HET");
    expect(r.so_ngay_dung_duoc).toBe(10);
  });
  it("đủ ngày dùng → OK", () => {
    // 10/ngày, tồn 150 → 15 ngày ≥ 14
    expect(tinhCanhBaoTon({ ...base, tong_ton: 150, nhap_30n: 500, xuat_su_dung_30n: 300 }).muc).toBe("OK");
  });
  it("hết hàng: HET_HANG khi có lịch sử, OK khi mặt hàng chưa từng dùng", () => {
    expect(tinhCanhBaoTon({ ...base, tong_ton: 0, nhap_30n: 50 }).muc).toBe("HET_HANG");
    expect(tinhCanhBaoTon({ ...base, tong_ton: 0 }).muc).toBe("OK");
  });
});
