/**
 * Chuẩn hóa hiển thị / đếm cổng khi DB còn CHECK trạng thái cũ (CHUA/DANG/HOAN/…)
 * hoặc đã migrate (DE_XUAT_CHO_DUYET, CHO_NHAN_VIEC, CHO_XAC_NHAN_HOAN_THANH).
 */

export type CongViecLike = {
  trang_thai?: string | null;
  is_active?: boolean | null;
  nguoi_phu_trach_id?: string | null;
  phan_tram_hoan_thanh?: number | null;
  /** Một số view/legacy dùng `tien_do` thay cho % */
  tien_do?: number | null;
};

/** Cổng 1 — đề xuất chờ phê (inactive proposal). */
export function isDeXuatChoDuyet(t: CongViecLike): boolean {
  if (t.trang_thai === "DE_XUAT_CHO_DUYET") return true;
  return t.is_active === false && t.trang_thai === "CHUA_BAT_DAU";
}

/** Cổng 2 — đã giao, chờ người phụ trách nhận. */
export function isChoNhanViec(t: CongViecLike): boolean {
  if (t.trang_thai === "CHO_NHAN_VIEC") return true;
  return Boolean(t.is_active && t.trang_thai === "CHUA_BAT_DAU" && t.nguoi_phu_trach_id);
}

/** Cổng 3 — đã báo 100%, chờ cấp trên nghiệm thu. */
export function isChoNghiemThuHoanThanh(t: CongViecLike): boolean {
  if (t.trang_thai === "CHO_XAC_NHAN_HOAN_THANH") return true;
  const pct = Number(t.phan_tram_hoan_thanh ?? t.tien_do ?? 0);
  return t.trang_thai === "DANG_THUC_HIEN" && pct >= 100;
}
