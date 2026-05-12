/**
 * Types cho VST Dashboard.
 * Tách riêng vì Next.js 16 cấm `"use server"` file export type/interface.
 */

export type VstDashboardPayload = {
  tu_ngay: string;
  den_ngay: string;
  kpis: {
    tong_phien: number;
    tong_co_hoi: number;
    da_tuan_thu: number;
    bo_sot: number;
    ty_le_tuan_thu: number;
  };
  trend: { ky: string; label: string; so_co_hoi: number; ty_le: number }[];
  by_khoa: { id?: string | null; ten: string; dat: number; tong: number; ty_le: number }[];
  by_khoi: { id?: string; ten: string; dat: number; tong: number; ty_le: number }[];
  by_doi_tuong: { ten: string; dat: number; tong: number; ty_le: number }[];
  by_khu_vuc: { ten: string; dat: number; tong: number; ty_le: number }[];
  moment_missed: { ten: string; so_lan: number }[];
  glove_abuse_by_moment: { ten: string; so_lan: number }[];
  supervision_sources: { ten: string; so_phien: number }[];
  participation: { id: string; ten: string; so_phien: number }[];
  by_moment_table?: {
    ten: string;
    tong: number;
    n_bo_sot: number;
    n_dat: number;
    ty_le_bo_sot: number;
    ty_le_tuan_thu: number;
  }[];
  error_breakdown: {
    loi_ky_thuat: number;
    loi_thoi_gian: number;
    lam_dung_gang: number;
    ty_le_lam_dung_gang: number;
    ty_le_dung_ky_thuat: number;
    ty_le_du_thoi_gian: number;
  };
};

export type VstDashboardFilters = {
  khoa_id?: string;
  khoa_ids?: string[];
  khoi_ids?: string[];
  nghe_nghiep_ids?: string[];
  khu_vuc_ids?: string[];
  tu_ngay?: string;
  den_ngay?: string;
  trend_type?: 'day' | 'week' | 'month';
  supervision_type?: 'ALL' | 'KSNK' | 'CHEO' | 'TU_GIAM_SAT';
};
