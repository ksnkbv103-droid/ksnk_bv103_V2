"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import {
  listMasterRows,
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";
import type { ThietBiRow } from "./thiet-bi.types";

export async function getThietBiRowsAction() {
  await verifyPermission("THIET_BI", "view");
  const result = await listMasterRows("dm_thiet_bi", "ma_thiet_bi");
  if (!result.success) return result;
  return { success: true as const, data: result.data as ThietBiRow[] };
}

/** Danh sách loại máy tiệt khuẩn (khai báo) — dùng cho form thiết bị. */
export async function getLoaiMayTietKhuanOptionsAction() {
  await verifyPermission("THIET_BI", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "LOAI_MAY_TIET_KHUAN");
    return {
      success: true as const,
      data: rows.map((r) => ({ id: r.id, ma_loai_may: r.ma, ten_loai_may: r.ten })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

function parseDateOnly(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export async function saveThietBiAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("THIET_BI", id ? "edit" : "create");
  const ma = String(input.ma_thiet_bi || "").trim().toUpperCase();
  const ten = String(input.ten_thiet_bi || "").trim();
  const namRaw = Number(input.nam_san_xuat);
  const nam = Number.isFinite(namRaw) ? Math.floor(namRaw) : null;
  const cycleRaw = Number(input.chu_ky_bao_tri_ngay);
  const cycle = Number.isFinite(cycleRaw) ? Math.max(1, Math.floor(cycleRaw)) : 180;

  if (!ma || !ten) {
    return { success: false as const, error: "Thiếu mã hoặc tên thiết bị." };
  }

  const payload = {
    ma_thiet_bi: ma,
    ten_thiet_bi: ten,
    loai_thiet_bi: String(input.loai_thiet_bi || "").trim() || null,
    trang_thai: String(input.trang_thai || "").trim() || "READY",
    hang_san_xuat: String(input.hang_san_xuat || "").trim() || null,
    nam_san_xuat: nam,
    ngay_dua_vao_su_dung: parseDateOnly(input.ngay_dua_vao_su_dung),
    chu_ky_bao_tri_ngay: cycle,
    ngay_bao_tri_gan_nhat: parseDateOnly(input.ngay_bao_tri_gan_nhat),
    ngay_bao_tri_tiep_theo: parseDateOnly(input.ngay_bao_tri_tiep_theo),
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  return upsertMasterRow("dm_thiet_bi", id, payload);
}

export async function toggleThietBiStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("THIET_BI", "edit");
  return toggleMasterStatus("dm_thiet_bi", id, currentStatus);
}

export async function softDeleteThietBiAction(id: string) {
  await verifyPermission("THIET_BI", "delete");
  return softDeleteMasterRow("dm_thiet_bi", id);
}

export async function softDeleteManyThietBiAction(ids: string[]) {
  await verifyPermission("THIET_BI", "delete");
  return softDeleteManyMasterRows("dm_thiet_bi", ids);
}
