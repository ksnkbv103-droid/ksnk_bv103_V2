/**
 * Types cho GSC Dashboard.
 * Tách riêng vì Next.js 16 cấm `"use server"` file export type/interface.
 */

export type GscDashboardPayload = {
  tu_ngay: string;
  den_ngay: string;
  kpis: {
    tong_phien: number;
    diem_tb: number;
    dat_chuan_90: number;
    duoi_chuan_90: number;
    ty_le_dat_tieu_chi: number;
  };
  monthly: { ky: string; label: string; so_phien: number; diem_tb: number }[];
  by_loai_bang_kiem: { loai_bang_kiem: string; so_phien: number }[];
  by_khoa: { ten_khoa: string; so_phien: number }[];
  by_ket_qua: { ket_qua: string; so_luong: number }[];
};
