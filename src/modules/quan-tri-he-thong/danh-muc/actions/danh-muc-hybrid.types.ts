/**
 * Types cho Trung tâm Danh mục (Quản trị hệ thống → tab Danh mục).
 * Tách riêng vì Next.js 16 cấm `"use server"` file export type/interface
 * (chỉ được export async function).
 */

export type DanhMucStat = { count: number; last?: string };

export type TrungTamDanhMucStatsPayload = Record<
  "loai" | "bo" | "le" | "tb" | "hc" | "khoa" | "ns" | "bk" | "tk",
  DanhMucStat
> & {
  /** Đếm theo từng `loaiDanhMuc` trong domain-registry (tab Danh mục chuyên biệt). */
  registryByLoai?: Record<string, DanhMucStat>;
};
