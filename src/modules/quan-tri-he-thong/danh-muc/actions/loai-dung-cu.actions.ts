"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";

type LoaiDungCuPayload = Record<string, unknown>;

export async function getLoaiDungCuRowsAction() {
  await verifyPermission("LOAI_DC", "view");
  const supabase = createAdminSupabaseClient();
  const query = supabase.from("dm_loai_dung_cu").select("*");
  const { data, error } = await query
    .order("is_active", { ascending: false })
    .order("ma_loai_dung_cu", { ascending: true });
  if (error) return { success: false, error: error.message };
  const strOrNull = (v: unknown) => (v == null || v === "" ? null : String(v));
  const mapped = (data || []).map((r: Record<string, unknown>) => ({
    id: String(r.id || ""),
    ma_danh_muc: String(r.ma_loai_dung_cu || ""),
    ten_danh_muc: String(r.ten_loai_dung_cu || ""),
    hinh_dang: strOrNull(r.hinh_dang),
    kich_thuoc: strOrNull(r.kich_thuoc),
    cong_dung: strOrNull(r.cong_dung),
    kha_nang_chiu_nhiet: strOrNull(r.kha_nang_chiu_nhiet),
    phuong_phap_tiet_khuan: strOrNull(r.phuong_phap_tiet_khuan),
    is_active: r.is_active !== false,
  }));
  return { success: true, data: mapped };
}

export async function saveLoaiDungCuAction(input: LoaiDungCuPayload) {
  const id = String(input.id || "").trim();
  await verifyPermission("LOAI_DC", id ? "edit" : "create");
  const payload = {
    ma_loai_dung_cu: String(input.ma_danh_muc || input.ma_loai_dung_cu || "").trim().toUpperCase(),
    ten_loai_dung_cu: String(input.ten_danh_muc || input.ten_loai_dung_cu || "").trim(),
    hinh_dang: String(input.hinh_dang || "").trim() || null,
    kich_thuoc: String(input.kich_thuoc || "").trim() || null,
    cong_dung: String(input.cong_dung || "").trim() || null,
    kha_nang_chiu_nhiet: String(input.kha_nang_chiu_nhiet || "").trim() || null,
    phuong_phap_tiet_khuan: String(input.phuong_phap_tiet_khuan || "").trim() || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  if (!payload.ma_loai_dung_cu || !payload.ten_loai_dung_cu) {
    return { success: false, error: "Thiếu mã hoặc tên loại dụng cụ." };
  }
  return upsertMasterRow("dm_loai_dung_cu", id, payload);
}

export async function toggleLoaiDungCuStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("LOAI_DC", "edit");
  return toggleMasterStatus("dm_loai_dung_cu", id, currentStatus);
}

export async function softDeleteLoaiDungCuAction(id: string) {
  await verifyPermission("LOAI_DC", "delete");
  return softDeleteMasterRow("dm_loai_dung_cu", id);
}

export async function softDeleteManyLoaiDungCuAction(ids: string[]) {
  await verifyPermission("LOAI_DC", "delete");
  return softDeleteManyMasterRows("dm_loai_dung_cu", ids);
}
