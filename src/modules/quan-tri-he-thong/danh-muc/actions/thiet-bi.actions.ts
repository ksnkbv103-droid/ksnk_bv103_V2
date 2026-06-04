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
  const supabase = createAdminSupabaseClient();
  
  // Chạy song song tải thiết bị và mẻ tiệt khuẩn để đếm tần suất
  const [tbRes, loRes] = await Promise.all([
    supabase.from("v_cssd_thiet_bi_full").select("*").order("ma_thiet_bi"),
    supabase.from("cssd_fact_lo_tiet_khuan").select("thiet_bi_id").eq("is_active", true),
  ]);

  if (tbRes.error) return { success: false as const, error: tbRes.error.message };
  if (loRes.error) return { success: false as const, error: loRes.error.message };

  const countsMap = new Map<string, number>();
  if (loRes.data) {
    for (const row of loRes.data) {
      const tbId = row.thiet_bi_id;
      if (tbId) {
        countsMap.set(tbId, (countsMap.get(tbId) || 0) + 1);
      }
    }
  }

  const list = (tbRes.data || []) as ThietBiRow[];
  const mapped = list.map((item) => ({
    ...item,
    so_lan_su_dung: countsMap.get(item.id) || 0,
  }));

  return { success: true as const, data: mapped };
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

  const loaiMa = String(input.loai_thiet_bi || "").trim();
  let loai_may_id: string | null = null;
  if (loaiMa) {
    const supabase = createAdminSupabaseClient();
    const byMa = await supabase.from("cssd_dm_loai_may").select("id").eq("ma_loai_may", loaiMa).maybeSingle();
    if (byMa.data?.id) loai_may_id = String(byMa.data.id);
    else if (/^[0-9a-f-]{36}$/i.test(loaiMa)) loai_may_id = loaiMa;
  }

  const specs = {
    hang_san_xuat: String(input.hang_san_xuat || "").trim() || null,
    nam_san_xuat: nam,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
  };

  const payload = {
    ma_thiet_bi: ma,
    ten_thiet_bi: ten,
    loai_may_id,
    trang_thai: String(input.trang_thai || "").trim() || "READY",
    ngay_dua_vao_su_dung: parseDateOnly(input.ngay_dua_vao_su_dung),
    chu_ky_bao_tri_ngay: cycle,
    ngay_bao_tri_gan_nhat: parseDateOnly(input.ngay_bao_tri_gan_nhat),
    ngay_bao_tri_tiep_theo: parseDateOnly(input.ngay_bao_tri_tiep_theo),
    specs,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };

  return upsertMasterRow("cssd_dm_thiet_bi", id, payload);
}

export async function toggleThietBiStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("THIET_BI", "edit");
  return toggleMasterStatus("cssd_dm_thiet_bi", id, currentStatus);
}

export async function softDeleteThietBiAction(id: string) {
  await verifyPermission("THIET_BI", "delete");
  return softDeleteMasterRow("cssd_dm_thiet_bi", id);
}

export async function softDeleteManyThietBiAction(ids: string[]) {
  await verifyPermission("THIET_BI", "delete");
  return softDeleteManyMasterRows("cssd_dm_thiet_bi", ids);
}
