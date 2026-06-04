"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createServerSupabaseUserClient } from "@/lib/supabase-server";

export interface DungCuGiaoDichRow {
  id: string;
  loai_dung_cu_id: string;
  bo_dung_cu_id: string | null;
  quy_trinh_id: string | null;
  loai_giao_dich: "NHAP_KHO" | "BAO_HONG" | "BAO_MAT" | "BO_SUNG" | "DIEU_CHUYEN";
  so_luong_thay_doi: number;
  ghi_chu: string | null;
  nguoi_thuc_hien_id: string | null;
  created_at: string;
  is_active: boolean;
  loai_dung_cu?: { ten_loai_dung_cu: string; ma_loai_dung_cu: string } | null;
  bo_dung_cu?: { ten_bo: string; ma_bo: string } | null;
  quy_trinh?: { ma_vach_set: string } | null;
}

export async function getDungCuGiaoDichLogsAction(params?: {
  loaiDungCuId?: string;
  boDungCuId?: string;
}) {
  await verifyPermission("LOAI_DC", "view");
  const supabase = await createServerSupabaseUserClient();
  let query = supabase
    .from("cssd_fact_kho_giao_dich")
    .select(`
      *,
      loai_dung_cu:cssd_dm_loai_dung_cu(id, ten_loai_dung_cu, ma_loai_dung_cu),
      bo_dung_cu:cssd_dm_bo_dung_cu(id, ten_bo, ma_bo),
      quy_trinh:fact_quy_trinh(id, ma_vach_set)
    `)
    .eq("is_active", true);

  if (params?.loaiDungCuId) {
    query = query.eq("loai_dung_cu_id", params.loaiDungCuId);
  }
  if (params?.boDungCuId) {
    query = query.eq("bo_dung_cu_id", params.boDungCuId);
  }

  const { data, error } = await query.order("created_at", { ascending: false }).limit(200);
  if (error) return { success: false as const, error: error.message };

  return {
    success: true as const,
    data: (data || []) as DungCuGiaoDichRow[],
  };
}
