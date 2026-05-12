/** Types Bộ dụng cụ chi tiết (preview row + reference). Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type BoDungCuChiTietPreviewRow = {
  id: string;
  ma_chi_tiet: string | null;
  ten_chi_tiet: string | null;
  ten_dung_cu_le: string | null;
  bo_dung_cu_id: string | null;
  loai_dung_cu_id: string | null;
  so_luong: number | null;
  max_suds_count: number | null;
  trong_luong: unknown;
  ghi_chu: string | null;
  is_active: boolean | null;
  loai_dung_cu: { ma_danh_muc: string | null; ten_danh_muc: string | null } | null;
};

export type BoRefByLoai = {
  id: string;
  ma_bo: string | null;
  ten_bo: string | null;
};
