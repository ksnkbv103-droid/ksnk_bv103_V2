/** Giá trị form khớp cột có thể sửa trên dm_bo_dung_cu. */

export interface BoDungCuFormValues {
  id?: string;
  ma_bo: string;
  ten_bo: string;
  loai_dung_cu_id: string;
  khoa_su_dung_id: string;
  quy_cach: string;
  ghi_chu: string;
  trang_thai: string;
  ngay_kiem_ke_gan_nhat: string;
  is_active: boolean;
}

/** Dòng từ bảng đã join loai_dung_cu (embedded). */
export interface BoDungCuTableRow {
  id: string;
  ma_bo?: string;
  ten_bo?: string;
  loai_dung_cu_id?: string | null;
  loai_dung_cu?: { ten_danh_muc?: string; ma_danh_muc?: string | null } | null;
  khoa_su_dung_id?: string | null;
  khoa_su_dung?: { ten_khoa?: string; ma_khoa?: string | null } | null;
  quy_cach?: string | null;
  ghi_chu?: string | null;
  trang_thai?: string | null;
  ngay_kiem_ke_gan_nhat?: string | null;
  is_active?: boolean;
}

export function mapBoDungCuRowToForm(row: BoDungCuTableRow | null): BoDungCuFormValues {
  if (!row) {
    return {
      ma_bo: "",
      ten_bo: "",
      loai_dung_cu_id: "",
      khoa_su_dung_id: "",
      quy_cach: "",
      ghi_chu: "",
      trang_thai: "ACTIVE",
      ngay_kiem_ke_gan_nhat: "",
      is_active: true,
    };
  }
  let dateStr = "";
  if (row.ngay_kiem_ke_gan_nhat) {
    const t = String(row.ngay_kiem_ke_gan_nhat);
    dateStr = t.slice(0, 16);
  }
  return {
    id: row.id,
    ma_bo: row.ma_bo || "",
    ten_bo: row.ten_bo || "",
    loai_dung_cu_id: row.loai_dung_cu_id || "",
    khoa_su_dung_id: row.khoa_su_dung_id || "",
    quy_cach: row.quy_cach || "",
    ghi_chu: row.ghi_chu || "",
    trang_thai: row.trang_thai || "ACTIVE",
    ngay_kiem_ke_gan_nhat: dateStr,
    is_active: row.is_active !== false,
  };
}
