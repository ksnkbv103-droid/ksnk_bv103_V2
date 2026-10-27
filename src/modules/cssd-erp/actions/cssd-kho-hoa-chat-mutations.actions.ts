"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { normalizeHanIso, normalizeMaLo } from "../helpers/kho-hoa-chat-lot";
import { getErrorMessage, mapFkError, revalidateCssdChemicalSurfaces } from "./cssd-action-common";

async function ghiGiaoDich(
  loai: "NHAP" | "XUAT" | "DIEU_CHINH",
  input: {
    dm_hoa_chat_id: string;
    so_luong: number;
    ma_lo?: string | null;
    han_su_dung?: string | null;
    ghi_chu?: string | null;
    su_co_id?: string | null;
  },
) {
  const uc = await createServerSupabaseUserClient();
  const { data: au, error: auErr } = await uc.auth.getUser();
  const userId = au.user?.id ? String(au.user.id) : "";
  if (auErr || !userId) return { success: false as const, error: "Không xác định được người thực hiện." };
  const supabase = createAdminSupabaseClient();
  // HC-1: kiểm tồn lô + ghi giao dịch nguyên tử trong DB (khóa theo hóa chất).
  const { error } = await supabase.rpc("rpc_cssd_kho_hoa_chat_ghi_giao_dich", {
    p_loai: loai,
    p_dm_hoa_chat_id: input.dm_hoa_chat_id,
    p_so_luong: input.so_luong,
    p_ma_lo: normalizeMaLo(input.ma_lo),
    p_han_su_dung: normalizeHanIso(input.han_su_dung),
    p_ghi_chu: input.ghi_chu != null ? String(input.ghi_chu).trim() || null : null,
    p_su_co_id: String(input.su_co_id || "").trim() || null,
    p_actor_user_id: userId,
    p_ma_phieu: null,
  });
  if (error) {
    if (error.code === "P0001") return { success: false as const, error: error.message };
    return { success: false as const, error: mapFkError(error.message) };
  }
  revalidateCssdChemicalSurfaces();
  return { success: true as const };
}

export async function nhapKhoHoaChatAction(input: {
  dm_hoa_chat_id: string;
  so_luong: number;
  ma_lo?: string | null;
  han_su_dung?: string | null;
  ghi_chu?: string | null;
}) {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const dmId = String(input.dm_hoa_chat_id || "").trim();
    const qty = Number(input.so_luong);
    if (!dmId) return { success: false as const, error: "Chọn hóa chất." };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false as const, error: "Số lượng nhập phải > 0." };
    return await ghiGiaoDich("NHAP", { ...input, dm_hoa_chat_id: dmId, so_luong: qty });
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
  su_co_id?: string | null;
}) {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const dmId = String(input.dm_hoa_chat_id || "").trim();
    const qty = Number(input.so_luong);
    if (!dmId) return { success: false as const, error: "Chọn hóa chất." };
    if (!Number.isFinite(qty) || qty <= 0) return { success: false as const, error: "Số lượng xuất phải > 0." };
    return await ghiGiaoDich("XUAT", { ...input, dm_hoa_chat_id: dmId, so_luong: qty });
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}

/** Điều chỉnh tồn (+/-) trên một khóa lô — dùng kiểm kê; số dương = tăng, âm = giảm. */
export async function dieuChinhKhoHoaChatAction(input: {
  dm_hoa_chat_id: string;
  so_luong_thay_doi: number;
  ma_lo?: string | null;
  han_su_dung?: string | null;
  ghi_chu?: string | null;
  su_co_id?: string | null;
}) {
  try {
    await verifyPermission("KSNK_KHO_HOACHAT", "edit");
    const dmId = String(input.dm_hoa_chat_id || "").trim();
    const delta = Number(input.so_luong_thay_doi);
    if (!dmId) return { success: false as const, error: "Chọn hóa chất." };
    if (!Number.isFinite(delta) || delta === 0) return { success: false as const, error: "Số điều chỉnh phải khác 0." };
    return await ghiGiaoDich("DIEU_CHINH", { ...input, dm_hoa_chat_id: dmId, so_luong: delta });
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
