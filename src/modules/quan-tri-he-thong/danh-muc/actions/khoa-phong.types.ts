/** Hàng danh mục Khoa/Phòng. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type KhoaPhongRow = {
  id: string;
  ma_danh_muc: string | null;
  ten_danh_muc: string | null;
  khoi_id?: string | null;
  ten_khoi?: string | null;
  mo_ta_chuc_nang?: string | null;
  so_bac_si?: number;
  so_dieu_duong?: number;
  so_giuong_benh_thuong?: number;
  so_giuong_cap_cuu?: number;
  is_active: boolean;
};
