"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { Catalog, CSSDBo, CSSDChiTiet, CSSDLoai, CSSDHoaChat } from "../types/catalog.types";

async function verifyCanViewKhoCatalog(): Promise<void> {
  const checks: Array<[string, string]> = [
    ["CSSD_KHO_DUNGCU", "view"],
    ["CSSD_KHO_DUNGCU", "edit"],
    ["CSSD_KHO_DUNGCU", "create"],
    ["CSSD_KHO_DUNGCU", "import"],
    ["CSSD_WORKFLOW", "view"],
  ];
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
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanViewKhoCatalog();

    // Lấy trực tiếp từ bảng DM để không phụ thuộc category của RPC registry.
    const [boRes, loaiRes, chiTietRes, hoaChatRes] = await Promise.all([
      supabase.from("dm_bo_dung_cu").select("id, ma_bo, ten_bo, loai_dung_cu_id, is_active").eq("is_active", true).order("ma_bo"),
      supabase
        .from("dm_loai_dung_cu")
        .select("id, ma_loai_dung_cu, ma_loai, ten_loai_dung_cu, ten_loai, is_active")
        .eq("is_active", true)
        .order("ma_loai_dung_cu"),
      supabase.from("dm_bo_dung_cu_chi_tiet").select("*").eq("is_active", true).order("ma_chi_tiet"),
      supabase.from("dm_hoa_chat").select("*").eq("is_active", true).order("ma_hoa_chat"),
    ]);

    if (boRes.error) throw boRes.error;
    if (loaiRes.error) throw loaiRes.error;
    if (chiTietRes.error) throw chiTietRes.error;
    if (hoaChatRes.error) throw hoaChatRes.error;

    const bo: CSSDBo[] = (boRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ma_bo: String(x.ma_bo || ""),
      ten_bo: String(x.ten_bo || ""),
      loai_dung_cu_id: x.loai_dung_cu_id ? String(x.loai_dung_cu_id) : null,
      is_active: x.is_active !== false,
    }));

    const loai: CSSDLoai[] = (loaiRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ma_loai_dung_cu: String(x.ma_loai_dung_cu || x.ma_loai || ""),
      ten_loai_dung_cu: String(x.ten_loai_dung_cu || x.ten_loai || ""),
      is_active: x.is_active !== false,
    }));

    const boMap = new Map<string, string>(bo.map((x) => [x.id, x.ten_bo] as const));
    const loaiMap = new Map<string, string>(loai.map((x) => [x.id, x.ten_loai_dung_cu] as const));

    const chi_tiet: CSSDChiTiet[] = (chiTietRes.data || []).map((x) => ({
      id: String(x.id),
      ma_chi_tiet: String(x.ma_chi_tiet || ""),
      ten_chi_tiet: String(x.ten_chi_tiet || ""),
      so_luong: x.so_luong != null ? Number(x.so_luong) : null,
      bo_dung_cu_id: x.bo_dung_cu_id ? String(x.bo_dung_cu_id) : null,
      ten_bo: x.bo_dung_cu_id ? boMap.get(String(x.bo_dung_cu_id)) || null : null,
      loai_dung_cu_id: x.loai_dung_cu_id ? String(x.loai_dung_cu_id) : null,
      ten_loai: x.loai_dung_cu_id ? loaiMap.get(String(x.loai_dung_cu_id)) || null : null,
      is_active: x.is_active !== false,
    }));

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
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

