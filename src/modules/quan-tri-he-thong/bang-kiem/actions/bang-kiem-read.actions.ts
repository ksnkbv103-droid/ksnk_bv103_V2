"use server";

import { sanitizeBusinessMaPrefix } from "@/lib/master-data/business-ma-prefix";
import { createServerSupabaseUserClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "../../actions/verify-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import type { DanhMucBangKiem, TieuChiBangKiem } from "../bang-kiem.types";
import { DM_TIEU_CHI_BANG_KIEM_ROW_SELECT } from "../lib/bang-kiem-dm-tieu-chi-select";

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
    const dmChildren = Array.isArray(bk.tieu_chi_jsonb) ? bk.tieu_chi_jsonb : [];
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
      .from("gstt_dm_bang_kiem")
      .select("*")
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
      .from("gstt_dm_bang_kiem")
      .select("*")
      .order("is_active", { ascending: false })
      .order("ma_bk", { ascending: true });
    if (error) throw error;
    return { success: true, data: normalizeBangKiemRows(data || []) };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

/**
 * Gợi ý mã bảng kiểm kế tiếp theo tiền tố (một RPC, không tải toàn bộ ma_bk).
 */
export async function suggestNextBangKiemMaAction(prefixRaw: string) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("BANG_KIEM", "view");
    const prefix = sanitizeBusinessMaPrefix(prefixRaw);
    if (!prefix) {
      return { success: false as const, error: "Tiền tố mã không hợp lệ." };
    }
    const { data, error } = await supabase.rpc("rpc_gstt_dm_bang_kiem_max_numeric_suffix", {
      p_prefix: prefix,
    });
    if (error) throw error;
    const maxSuffix = typeof data === "number" ? data : Number.parseInt(String(data ?? "0"), 10);
    const maxSafe = Number.isFinite(maxSuffix) ? maxSuffix : 0;
    const nextNum = maxSafe + 1;
    const nextCode = `${prefix}${nextNum.toString().padStart(3, "0")}`;
    return { success: true as const, nextCode };
  } catch (error: unknown) {
    return { success: false as const, error: errMsg(error) };
  }
}

export async function getTieuChis(bangKiemId: string, activeOnly = false) {
  try {
    await verifyPermission("BANG_KIEM_DETAIL", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("gstt_dm_bang_kiem").select("tieu_chi_jsonb").eq("id", bangKiemId).single();
    if (error) throw error;
    let tieuChis = Array.isArray(data?.tieu_chi_jsonb) ? data.tieu_chi_jsonb : [];
    if (activeOnly) tieuChis = tieuChis.filter((t: any) => t.is_active !== false);
    tieuChis.sort((a: any, b: any) => (a.stt || 0) - (b.stt || 0));
    return { success: true, data: tieuChis };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

/** Tiêu chí bảng kiểm khi làm việc trong module Giám sát chung (không yêu cầu BANG_KIEM_DETAIL). */
export async function getTieuChisForGiamSatChung(bangKiemId: string, activeOnly = false) {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.from("gstt_dm_bang_kiem").select("tieu_chi_jsonb").eq("id", bangKiemId).single();
    if (error) throw error;
    let tieuChis = Array.isArray(data?.tieu_chi_jsonb) ? data.tieu_chi_jsonb : [];
    if (activeOnly) tieuChis = tieuChis.filter((t: any) => t.is_active !== false);
    tieuChis.sort((a: any, b: any) => (a.stt || 0) - (b.stt || 0));
    return { success: true, data: tieuChis };
  } catch (error: unknown) {
    return { success: false, error: errMsg(error) };
  }
}

export async function getBangKiemsForGiamSat() {
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("gstt_dm_bang_kiem")
      .select("*")
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

/** Dropdown “Loại hình giám sát” — đồng bộ với hub `HINH_THUC_GIAM_SAT` / `gstt_dm_hinh_thuc_giam_sat`. */
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
