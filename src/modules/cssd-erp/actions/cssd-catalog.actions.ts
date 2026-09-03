"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { Catalog, CSSDBo, CSSDHoaChat } from "../types/catalog.types";

import { CSSD_KHO_CATALOG_PERMISSION_CANDIDATES } from "../lib/cssd-catalog-permission-candidates";
import { getErrorMessage } from "../shared/cssd-db-utils";

async function verifyCanViewKhoCatalog(): Promise<void> {
  const checks = CSSD_KHO_CATALOG_PERMISSION_CANDIDATES;
  for (const [moduleKey, action] of checks) {
    try {
      await verifyPermission(moduleKey, action);
      return;
    } catch {
      /* try next permission candidate */
    }
  }
  await verifyPermission("CSSD_KHO_DUNGCU", "view");
}

/** Danh mục nhanh ngay trong màn kho để tìm kiếm/đối chiếu/báo sự cố. */
export async function getKhoCatalogPayloadAction(): Promise<
  { success: true; data: Catalog } | { success: false; error: string }
> {
  try {
    await verifyCanViewKhoCatalog();
    const supabase = createAdminSupabaseClient();

    // Lấy trực tiếp từ bảng DM để không phụ thuộc category của RPC registry.
    const [boRes, boMetaRes, hoaChatRes, khoaRes] = await Promise.all([
      supabase
        .from("v_cssd_bo_dung_cu_summary")
        .select(
          "id, ma_bo, ten_bo, loai_dung_cu_id, is_active, so_luong_bo, so_khoan, tong_so_luong_dung_cu, khoa_su_dung_id",
        )
        .eq("is_active", true)
        .order("ma_bo"),
      supabase
        .from("cssd_dm_bo_dung_cu")
        .select("id, phan_loai_bo, co_ma_dinh_danh_rieng")
        .eq("is_active", true),
      supabase
        .from("cssd_dm_hoa_chat")
        .select("id, ma_hoa_chat, ten_hoa_chat, loai_hoa_chat, don_vi_tinh, is_active")
        .eq("is_active", true)
        .order("ma_hoa_chat"),
      supabase.from("mdm_dm_khoa_phong").select("id, ten_khoa, ma_khoa"),
    ]);

    if (boRes.error) throw boRes.error;
    if (boMetaRes.error) throw boMetaRes.error;
    if (hoaChatRes.error) throw hoaChatRes.error;
    if (khoaRes.error) throw khoaRes.error;

    const khoaMap = new Map<string, string>(
      (khoaRes.data || []).map((x) => [String(x.id), String(x.ma_khoa || x.ten_khoa)] as const)
    );

    const boMetaMap = new Map<
      string,
      { phan_loai_bo: string | null; co_ma_dinh_danh_rieng: boolean }
    >(
      (boMetaRes.data || []).map((x) => [
        String(x.id),
        {
          phan_loai_bo: x.phan_loai_bo ? String(x.phan_loai_bo) : null,
          co_ma_dinh_danh_rieng: x.co_ma_dinh_danh_rieng !== false,
        },
      ] as const),
    );

    const bo: CSSDBo[] = (boRes.data || []).map((x) => {
      const meta = boMetaMap.get(String(x.id || ""));
      return {
      id: String(x.id || ""),
      ma_bo: String(x.ma_bo || ""),
      ten_bo: String(x.ten_bo || ""),
      loai_dung_cu_id: x.loai_dung_cu_id ? String(x.loai_dung_cu_id) : null,
      is_active: x.is_active !== false,
      phan_loai_bo: meta?.phan_loai_bo ?? null,
      co_ma_dinh_danh_rieng: meta?.co_ma_dinh_danh_rieng ?? true,
      so_luong_bo: x.so_luong_bo != null ? Number(x.so_luong_bo) : null,
      so_khoan: x.so_khoan != null ? Number(x.so_khoan) : null,
      tong_so_luong_dung_cu: x.tong_so_luong_dung_cu != null ? Number(x.tong_so_luong_dung_cu) : null,
      khoa_su_dung_id: x.khoa_su_dung_id ? String(x.khoa_su_dung_id) : null,
      ten_khoa: x.khoa_su_dung_id ? khoaMap.get(String(x.khoa_su_dung_id)) || null : null,
    };
    });

    const loai: Catalog["loai"] = [];
    const chi_tiet: Catalog["chi_tiet"] = [];

    const hoa_chat: CSSDHoaChat[] = (hoaChatRes.data || []).map((x) => ({
      id: String(x.id),
      ma_hoa_chat: String(x.ma_hoa_chat || ""),
      ten_hoa_chat: String(x.ten_hoa_chat || ""),
      loai_hoa_chat: x.loai_hoa_chat ? String(x.loai_hoa_chat) : null,
      don_vi_tinh: x.don_vi_tinh ? String(x.don_vi_tinh) : null,
      is_active: x.is_active !== false,
    }));

    return { success: true, data: { bo, chi_tiet, loai, hoa_chat } };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export async function lookupBoDungCuIdByQrAction(qrCode: string): Promise<
  { success: true; boDungCuId: string | null } | { success: false; error: string }
> {
  try {
    await verifyCanViewKhoCatalog();
    const supabase = createAdminSupabaseClient();
    const code = String(qrCode || "").trim().toUpperCase();
    if (!code) return { success: true, boDungCuId: null };

    const { resolveCssdCodeWithClient } = await import("../shared/application/cssd-qr-hub");
    const resolved = await resolveCssdCodeWithClient(supabase, code);
    if (resolved.targetType === "INSTRUMENT_SET" && resolved.boDungCuId) {
      return { success: true, boDungCuId: resolved.boDungCuId };
    }
    return { success: true, boDungCuId: null };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

