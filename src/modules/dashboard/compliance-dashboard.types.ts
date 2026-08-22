/** Shared dashboard filter + staff stats types (client-safe). */

export type DashboardFilterOptions = {
  bang_kiem: { id: string; label: string; loai_giam_sat?: string | null }[];
  khoi: { id: string; label: string }[];
  khoa: { id: string; label: string; khoi_id?: string }[];
  nghe_nghiep: { id: string; label: string }[];
  khu_vuc: { id: string; label: string }[];
};
