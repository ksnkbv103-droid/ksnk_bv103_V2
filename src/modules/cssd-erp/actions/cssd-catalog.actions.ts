"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { Catalog, CSSDBo, CSSDChiTiet, CSSDLoai, CSSDHoaChat } from "../types/catalog.types";

async function verifyCanViewKhoCatalog(): Promise<void> {
  try {
    await verifyPermission("CSSD_KHO_DUNGCU", "view");
    return;
  } catch {
    /* fall through */
  }
  await verifyPermission("CSSD_WORKFLOW", "view");
}

/** Danh mục nhanh ngay trong màn kho để tìm kiếm/đối chiếu/báo sự cố. */
export async function getKhoCatalogPayloadAction(): Promise<
  { success: true; data: Catalog } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanViewKhoCatalog();

    // 1. Lấy dữ liệu tập trung qua RPC duy nhất
    const { data, error } = await supabase.rpc("rpc_get_registry_options", {
      p_categories: ["BO_DUNG_CU", "LOAI_DUNG_CU"],
    });
    if (error) throw error;
    
    interface RegistryEntry { id: string; ma?: string; ten?: string; category?: string };
    const registry = data as Record<string, RegistryEntry[]>;

    // 2. Fetch chi tiết và hóa chất vẫn tách bảng riêng (vì chi tiết có cấu phần link bộ)
    const [chiTietRes, hoaChatRes] = await Promise.all([
      supabase.from("dm_bo_dung_cu_chi_tiet").select("*").order("ma_chi_tiet"),
      supabase.from("dm_hoa_chat").select("*").order("ma_hoa_chat"),
    ]);

    if (chiTietRes.error) throw chiTietRes.error;
    if (hoaChatRes.error) throw hoaChatRes.error;

    // 3. Mapping tối giản
    const bo: CSSDBo[] = (registry.BO_DUNG_CU || []).map((x) => ({
      id: String(x.id),
      ma_bo: String(x.ma || ""),
      ten_bo: String(x.ten || ""),
      loai_dung_cu_id: null,
      is_active: true,
    }));

    const loai: CSSDLoai[] = (registry.LOAI_DUNG_CU || []).map((x) => ({
      id: String(x.id),
      ma_loai_dung_cu: String(x.ma || ""),
      ten_loai_dung_cu: String(x.ten || ""),
      is_active: true,
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

