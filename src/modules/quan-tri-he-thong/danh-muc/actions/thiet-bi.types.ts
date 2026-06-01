/** Types Danh mục Thiết bị. Tách khỏi action vì Next.js 16 cấm `"use server"` file export type. */

export type ThietBiRow = {
  id: string;
  ma_thiet_bi: string | null;
  ten_thiet_bi: string | null;
  loai_thiet_bi: string | null;
  trang_thai: string | null;
  hang_san_xuat: string | null;
  nam_san_xuat: number | null;
  ngay_dua_vao_su_dung: string | null;
  chu_ky_bao_tri_ngay: number | null;
  ngay_bao_tri_gan_nhat: string | null;
  ngay_bao_tri_tiep_theo: string | null;
  ghi_chu: string | null;
  is_active: boolean;
  so_lan_su_dung?: number;
  specs?: Record<string, any> | null;
};

export type LoaiMayTietKhuanOption = {
  id: string;
  ma_loai_may: string;
  ten_loai_may: string;
};
