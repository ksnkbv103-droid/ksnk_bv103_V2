export type DashboardTabType = "overview" | "ksnk" | "cheo" | "tu_giam_sat" | "gap";

export type DashboardHeaderFallback = {
  khoas?: { id: string; ten_danh_muc?: string | null }[];
  ngheNghieps?: { id: string; ten_danh_muc?: string | null }[];
  khuVucs?: { id: string; ten_danh_muc?: string | null }[];
};
