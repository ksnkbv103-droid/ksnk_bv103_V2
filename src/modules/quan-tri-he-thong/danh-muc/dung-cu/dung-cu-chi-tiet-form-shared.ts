/** Kiểu dữ liệu dùng cho bảng và form Dụng cụ chi tiết (dm_bo_dung_cu_chi_tiet). */
export type DungCuChiTietBoRef = {
  id: string;
  ma_bo?: string | null;
  ten_bo?: string | null;
} | null;

export type DungCuChiTietLoaiRef = {
  id: string;
  ma_danh_muc?: string | null;
  ten_danh_muc?: string | null;
} | null;

export type DungCuChiTietTableRow = {
  id: string;
  ma_chi_tiet: string | null;
  ten_chi_tiet: string | null;
  ten_dung_cu_le?: string | null;
  bo_dung_cu_id: string | null;
  loai_dung_cu_id?: string | null;
  so_luong: number | null;
  max_suds_count: number | null;
  trong_luong: string | number | null;
  ghi_chu: string | null;
  ma_qr_mau: string | null;
  is_active: boolean;
  bo_dung_cu: DungCuChiTietBoRef;
  loai_dung_cu?: DungCuChiTietLoaiRef;
};

export type DungCuChiTietFormValues = {
  id?: string;
  ma_chi_tiet: string;
  ten_chi_tiet: string;
  bo_dung_cu_id: string;
  loai_dung_cu_id: string;
  so_luong: string;
  max_suds_count: string;
  trong_luong: string;
  ghi_chu: string;
  ma_qr_mau: string;
  is_active: boolean;
};

export function mapChiTietRowToForm(row: DungCuChiTietTableRow | null): DungCuChiTietFormValues {
  if (!row) {
    return {
      ma_chi_tiet: "",
      ten_chi_tiet: "",
      bo_dung_cu_id: "",
      loai_dung_cu_id: "",
      so_luong: "1",
      max_suds_count: "100",
      trong_luong: "",
      ghi_chu: "",
      ma_qr_mau: "",
      is_active: true,
    };
  }
  const tl = row.trong_luong;
  const tlStr =
    tl === null || tl === undefined || tl === ""
      ? ""
      : typeof tl === "number"
        ? String(tl)
        : String(tl);
  return {
    id: row.id,
    ma_chi_tiet: String(row.ma_chi_tiet || ""),
    ten_chi_tiet: String(row.ten_chi_tiet || row.ten_dung_cu_le || ""),
    bo_dung_cu_id: row.bo_dung_cu_id ? String(row.bo_dung_cu_id) : "",
    loai_dung_cu_id: row.loai_dung_cu_id ? String(row.loai_dung_cu_id) : "",
    so_luong: row.so_luong != null ? String(row.so_luong) : "1",
    max_suds_count:
      row.max_suds_count != null && row.max_suds_count !== undefined
        ? String(row.max_suds_count)
        : "100",
    trong_luong: tlStr,
    ghi_chu: row.ghi_chu != null ? String(row.ghi_chu) : "",
    ma_qr_mau: row.ma_qr_mau != null ? String(row.ma_qr_mau) : "",
    is_active: row.is_active !== false,
  };
}
