/** Cảnh báo «sắp hết» kho hóa chất (thuần, không I/O). PO 2026-10-29: hai tầng, tính từ sổ nhập/xuất, không bảng tổng hợp. */

export const CANH_BAO_PCT_MAC_DINH = 20;
export const CANH_BAO_NGAY_CHO_MAC_DINH = 14;
/** Cửa sổ tính lượng nhập và mức tiêu thụ (ngày). */
export const CANH_BAO_CUA_SO_NGAY = 30;

export type CanhBaoTonInput = {
  tong_ton: number;
  /** Tổng nhập đã duyệt trong cửa sổ. */
  nhap_30n: number;
  /** Tổng xuất lý do «Cấp sử dụng» đã duyệt trong cửa sổ (số dương). */
  xuat_su_dung_30n: number;
  nguong_ton_toi_thieu: number | null;
  ty_le_canh_bao_pct?: number | null;
  so_ngay_cho_hang?: number | null;
};

export type MucCanhBaoTon = "OK" | "SAP_HET" | "HET_HANG";

export type CanhBaoTon = {
  muc: MucCanhBaoTon;
  /** Ngưỡng tồn đang áp dụng (% lượng nhập, hoặc định mức tối thiểu khi chưa có nhập). */
  nguong_hieu_luc: number | null;
  /** Số ngày còn dùng được theo mức tiêu thụ TB; null khi chưa có số liệu xuất. */
  so_ngay_dung_duoc: number | null;
  ly_do: string | null;
};

const lam = (n: number) => Math.round(n * 100) / 100;

export function tinhCanhBaoTon(i: CanhBaoTonInput): CanhBaoTon {
  const pct = i.ty_le_canh_bao_pct ?? CANH_BAO_PCT_MAC_DINH;
  const ngayCho = i.so_ngay_cho_hang ?? CANH_BAO_NGAY_CHO_MAC_DINH;
  const coSoLieu = i.nhap_30n > 0 || i.xuat_su_dung_30n > 0 || i.nguong_ton_toi_thieu != null;

  const nguong = i.nhap_30n > 0 ? lam((i.nhap_30n * pct) / 100) : i.nguong_ton_toi_thieu;
  const ngay = i.xuat_su_dung_30n > 0 ? lam(i.tong_ton / (i.xuat_su_dung_30n / CANH_BAO_CUA_SO_NGAY)) : null;

  if (i.tong_ton <= 0) {
    return { muc: coSoLieu ? "HET_HANG" : "OK", nguong_hieu_luc: nguong, so_ngay_dung_duoc: ngay === null ? null : 0, ly_do: coSoLieu ? "Đã hết hàng." : null };
  }
  if (nguong != null && nguong > 0 && i.tong_ton <= nguong) {
    const goc = i.nhap_30n > 0 ? `${pct}% lượng nhập ${CANH_BAO_CUA_SO_NGAY} ngày (${lam(i.nhap_30n)})` : `định mức tối thiểu ${nguong}`;
    return { muc: "SAP_HET", nguong_hieu_luc: nguong, so_ngay_dung_duoc: ngay, ly_do: `Tồn ${lam(i.tong_ton)} ≤ ${goc}.` };
  }
  if (ngay !== null && ngay < ngayCho) {
    return { muc: "SAP_HET", nguong_hieu_luc: nguong, so_ngay_dung_duoc: ngay, ly_do: `Chỉ dùng được ~${Math.floor(ngay)} ngày, ít hơn ${ngayCho} ngày chờ hàng.` };
  }
  return { muc: "OK", nguong_hieu_luc: nguong, so_ngay_dung_duoc: ngay, ly_do: null };
}
