/** Shared dashboard filter + staff stats types (client-safe). */

export type DashboardFilterOptions = {
  bang_kiem: { id: string; label: string }[];
  khoi: { id: string; label: string }[];
  khoa: { id: string; label: string; khoi_id?: string }[];
  nghe_nghiep: { id: string; label: string }[];
  khu_vuc: { id: string; label: string }[];
};

/** Nhân viên KSNK — cơ hội VST + phiên VST + phiên GSC (lazy load Command Center). */
export type DashboardKsnkStaffSupervisionRow = {
  id: string;
  ho_ten: string;
  ma_nv: string;
  so_co_hoi_vst: number;
  so_phien_vst: number;
  so_phien_gsc: number;
};
