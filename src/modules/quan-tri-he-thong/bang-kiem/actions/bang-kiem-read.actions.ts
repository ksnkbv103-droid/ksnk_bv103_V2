"use server";

import { createServerSupabaseUserClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import type { DanhMucBangKiem, TieuChiBangKiem } from "../bang-kiem.types";

function errMsg(e: unknown) {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const anyErr = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [
      typeof anyErr.message === "string" ? anyErr.message : "",
      typeof anyErr.details === "string" ? anyErr.details : "",
      typeof anyErr.hint === "string" ? anyErr.hint : "",
      typeof anyErr.code === "string" ? `(code: ${anyErr.code})` : "",
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }
  return "Lỗi không xác định khi tải danh mục bảng kiểm";
}

function normalizeBangKiemRows(rows: unknown[]): DanhMucBangKiem[] {
  return ((rows || []) as Array<Record<string, unknown>>).map((bk) => {
    const dmChildren = Array.isArray(bk.dm_tieu_chi_bang_kiem) ? bk.dm_tieu_chi_bang_kiem : [];
    return {
      ...(bk as DanhMucBangKiem),
      tieu_chi_bang_kiem: dmChildren as TieuChiBangKiem[],
    };
  });
}

export async function getBangKiems() {
  try {
    await verifyPermission("BANG_KIEM", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("dm_bang_kiem")
      .select("*, dm_tieu_chi_bang_kiem(*)")
      .order("is_active", { ascending: false })
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    return { success: true, data: normalizeBangKiemRows(data || []) };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getExportData() {
  try {
    await verifyPermission("BANG_KIEM", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("dm_bang_kiem")
      .select("*, dm_tieu_chi_bang_kiem(*)")
      .order("is_active", { ascending: false })
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    return { success: true, data: normalizeBangKiemRows(data || []) };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getAllMaBangKiem() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("BANG_KIEM", "view");
    const { data, error } = await supabase.from("dm_bang_kiem").select("ma_bk").eq("is_active", true);
    if (error) throw error;
    return {
      success: true,
      data: (data || []).map((d: { ma_bk?: string }) => ({ ma: d.ma_bk })),
    };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getTieuChis(bangKiemId: string, activeOnly = false) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "view");
    const supabase = createAdminSupabaseClient();
    let query = supabase.from("dm_tieu_chi_bang_kiem").select("*").eq("bang_kiem_id", bangKiemId);
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query.order("stt", { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

/** Tiêu chí bảng kiểm khi làm việc trong module Giám sát chung (không yêu cầu BANG_KIEM_DETAIL). */
export async function getTieuChisForGiamSatChung(bangKiemId: string, activeOnly = false) {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = createAdminSupabaseClient();
    let query = supabase.from("dm_tieu_chi_bang_kiem").select("*").eq("bang_kiem_id", bangKiemId);
    if (activeOnly) query = query.eq("is_active", true);
    const { data, error } = await query.order("stt", { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getBangKiemsForGiamSat() {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("dm_bang_kiem")
      .select("*, dm_tieu_chi_bang_kiem(*)")
      .eq("is_active", true)
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    const filteredData = normalizeBangKiemRows(data || []).map((bk) => ({
      ...bk,
      tieu_chi_bang_kiem: (bk.tieu_chi_bang_kiem || []).filter(
        (tc: TieuChiBangKiem) => tc.is_active === true,
      ),
    }));
    return { success: true, data: filteredData };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

/** Dropdown “Loại hình giám sát” — đồng bộ với hub `HINH_THUC_GIAM_SAT` / `dm_hinh_thuc_giam_sat`. */
export async function getHinhThucGiamSatOptionsForBangKiemAction() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("BANG_KIEM", "view");
    const rows = await fetchActiveRegistryDmRows(supabase, "HINH_THUC_GIAM_SAT");
    return { success: true as const, data: rows };
  } catch (error: unknown) {
    return { success: false as const, error: errMsg(error), data: [] as RegistrySelectRow[] };
  }
}
