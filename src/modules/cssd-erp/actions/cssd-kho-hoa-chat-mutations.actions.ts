"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeHanIso, normalizeMaLo } from "../helpers/kho-hoa-chat-lot";
import { getErrorMessage, mapFkError, revalidateCssdChemicalSurfaces } from "./cssd-action-common";

function maPhieu(loai: "NHAP" | "XUAT" | "DIEU_CHINH"): string {
  const p = loai === "NHAP" ? "NK" : loai === "XUAT" ? "XK" : "DC";
  return `${p}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

async function tonTaiLo(client: SupabaseClient, dmId: string, maLo: string | null, han: string | null): Promise<number> {
  const { data } = await client
    .from("cssd_fact_kho_hoa_chat_giao_dich")
    .select("ma_lo, han_su_dung, so_luong_co_dau, is_active")
    .eq("dm_hoa_chat_id", dmId);
  const rows = (data || []) as Array<{
    ma_lo?: string | null;
    han_su_dung?: string | null;
    so_luong_co_dau?: unknown;
    is_active?: boolean | null;
  }>;
  const tl = normalizeMaLo(maLo);
  const th = normalizeHanIso(han);
  let s = 0;
  for (const r of rows) {
    if (r.is_active === false) continue;
    if (normalizeMaLo(r.ma_lo) === tl && normalizeHanIso(r.han_su_dung) === th) {
      s += Number(r.so_luong_co_dau || 0);
    }
  }
  return s;
}

export async function nhapKhoHoaChatAction(input: {
  dm_hoa_chat_id: string;
  so_luong: number;
  ma_lo?: string | null;
  han_su_dung?: string | null;
  ghi_chu?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const dmId = String(input.dm_hoa_chat_id || "").trim();
    const qty = Number(input.so_luong);
    if (!dmId) return { success: false as const, error: "Chọn hóa chất." };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false as const, error: "Số lượng nhập phải > 0." };
    const maLo = normalizeMaLo(input.ma_lo);
    const han = normalizeHanIso(input.han_su_dung);
    const now = new Date().toISOString();
    const { error } = await supabase.from("cssd_fact_kho_hoa_chat_giao_dich").insert({
      ma_phieu: maPhieu("NHAP"),
      dm_hoa_chat_id: dmId,
      loai_giao_dich: "NHAP",
      so_luong_co_dau: qty,
      ma_lo: maLo,
      han_su_dung: han,
      ghi_chu: input.ghi_chu != null ? String(input.ghi_chu).trim() || null : null,
      updated_at: now,
    });
    if (error) return { success: false as const, error: mapFkError(error.message) };
    revalidateCssdChemicalSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

export async function xuatKhoHoaChatAction(input: {
  dm_hoa_chat_id: string;
  so_luong: number;
  ma_lo?: string | null;
  han_su_dung?: string | null;
  ghi_chu?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const dmId = String(input.dm_hoa_chat_id || "").trim();
    const qtyUi = Number(input.so_luong);
    if (!dmId) return { success: false as const, error: "Chọn hóa chất." };
    if (!Number.isFinite(qtyUi) || qtyUi <= 0) return { success: false as const, error: "Số lượng xuất phải > 0." };
    const maLo = normalizeMaLo(input.ma_lo);
    const han = normalizeHanIso(input.han_su_dung);
    const ton = await tonTaiLo(supabase, dmId, maLo, han);
    if (ton < qtyUi) {
      return {
        success: false as const,
        error: `Không đủ tồn tại lô đã chọn (tồn ${ton}, cần ${qtyUi}).`,
      };
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("cssd_fact_kho_hoa_chat_giao_dich").insert({
      ma_phieu: maPhieu("XUAT"),
      dm_hoa_chat_id: dmId,
      loai_giao_dich: "XUAT",
      so_luong_co_dau: -qtyUi,
      ma_lo: maLo,
      han_su_dung: han,
      ghi_chu: input.ghi_chu != null ? String(input.ghi_chu).trim() || null : null,
      updated_at: now,
    });
    if (error) return { success: false as const, error: mapFkError(error.message) };
    revalidateCssdChemicalSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Điều chỉnh tồng tồn (+/-) trên một khóa lô — dùng kiểm kê; số dương = tăng, âm = giảm. */
export async function dieuChinhKhoHoaChatAction(input: {
  dm_hoa_chat_id: string;
  so_luong_thay_doi: number;
  ma_lo?: string | null;
  han_su_dung?: string | null;
  ghi_chu?: string | null;
}) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const dmId = String(input.dm_hoa_chat_id || "").trim();
    const delta = Number(input.so_luong_thay_doi);
    if (!dmId) return { success: false as const, error: "Chọn hóa chất." };
    if (!Number.isFinite(delta) || delta === 0) return { success: false as const, error: "Số điều chỉnh phải khác 0." };
    const maLo = normalizeMaLo(input.ma_lo);
    const han = normalizeHanIso(input.han_su_dung);
    if (delta < 0) {
      const ton = await tonTaiLo(supabase, dmId, maLo, han);
      if (ton + delta < 0) {
        return { success: false as const, error: `Điều chỉnh âm vượt tồn hiện có (${ton}).` };
      }
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("cssd_fact_kho_hoa_chat_giao_dich").insert({
      ma_phieu: maPhieu("DIEU_CHINH"),
      dm_hoa_chat_id: dmId,
      loai_giao_dich: "DIEU_CHINH",
      so_luong_co_dau: delta,
      ma_lo: maLo,
      han_su_dung: han,
      ghi_chu: input.ghi_chu != null ? String(input.ghi_chu).trim() || null : null,
      updated_at: now,
    });
    if (error) return { success: false as const, error: mapFkError(error.message) };
    revalidateCssdChemicalSurfaces();
    return { success: true as const };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
