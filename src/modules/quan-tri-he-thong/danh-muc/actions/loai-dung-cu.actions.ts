"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import {
  buildLoaiPhysicalUpsertPayload,
  mapIsChiuNhietToKhaNang,
  normalizeSpauldingForMaster,
  normalizeSterileMethodForMaster,
  spauldingLabel,
  sterileMethodLabel,
} from "@/lib/master-data/cssd-loai-dung-cu-map";
import { normalizeBoDungCuChua } from "@/lib/domain/cssd-loai-set-links";
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
  const query = supabase.from("v_cssd_loai_dung_cu_summary").select("*");
  const { data, error } = await query
    .order("is_active", { ascending: false })
    .order("ma_loai_dung_cu", { ascending: true });
  if (error) return { success: false, error: error.message };
  const strOrNull = (v: unknown) => (v == null || v === "" ? null : String(v));
  const mapped = (data || []).map((r: Record<string, unknown>) => {
    const isChiuNhiet = r.is_chiu_nhiet !== false;
    const sterile = normalizeSterileMethodForMaster(r.phuong_phap_tiet_khuan);
    const spaulding = normalizeSpauldingForMaster(r.phan_loai_spaulding);
    return {
      id: String(r.id || ""),
      ma_danh_muc: String(r.ma_loai_dung_cu || r.ma_loai || ""),
      ten_danh_muc: String(r.ten_loai_dung_cu || r.ten_loai || ""),
      hinh_dang: strOrNull(r.hinh_dang),
      kich_thuoc: strOrNull(r.kich_thuoc),
      cong_dung: strOrNull(r.cong_dung),
      is_chiu_nhiet: isChiuNhiet,
      kha_nang_chiu_nhiet: mapIsChiuNhietToKhaNang(isChiuNhiet),
      phan_loai_spaulding: spaulding,
      phan_loai_spaulding_label: spauldingLabel(spaulding),
      phuong_phap_tiet_khuan: sterile,
      phuong_phap_tiet_khuan_label: sterileMethodLabel(sterile),
      phan_loai: String(r.phan_loai || "PHAU_THUAT"),
      so_luong_kho_du_phong: Number(r.so_luong_kho_du_phong || 0),
      so_luong_tong: Number(r.so_luong_tong || 0),
      bo_dung_cu_chua: normalizeBoDungCuChua(r.bo_dung_cu_chua),
      is_active: r.is_active !== false,
    };
  });
  return { success: true, data: mapped };
}

export async function saveLoaiDungCuAction(input: LoaiDungCuPayload) {
  const id = String(input.id || "").trim();
  await verifyPermission("LOAI_DC", id ? "edit" : "create");
  const payload = buildLoaiPhysicalUpsertPayload(input);
  const ma = String(payload.ma_loai || "");
  const ten = String(payload.ten_loai || "");
  if (!ma || !ten) {
    return { success: false, error: "Thiếu mã hoặc tên loại dụng cụ." };
  }
  return upsertMasterRow("cssd_dm_loai_dung_cu", id, payload);
}

export async function toggleLoaiDungCuStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("LOAI_DC", "edit");
  return toggleMasterStatus("cssd_dm_loai_dung_cu", id, currentStatus);
}

export async function softDeleteLoaiDungCuAction(id: string) {
  await verifyPermission("LOAI_DC", "delete");
  return softDeleteMasterRow("cssd_dm_loai_dung_cu", id);
}

export async function softDeleteManyLoaiDungCuAction(ids: string[]) {
  await verifyPermission("LOAI_DC", "delete");
  return softDeleteManyMasterRows("cssd_dm_loai_dung_cu", ids);
}
