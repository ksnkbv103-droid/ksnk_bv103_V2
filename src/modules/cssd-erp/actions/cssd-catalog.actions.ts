"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { Catalog, CSSDBo, CSSDChiTiet, CSSDLoai, CSSDHoaChat } from "../types/catalog.types";

import { CSSD_KHO_CATALOG_PERMISSION_CANDIDATES } from "../lib/cssd-catalog-permission-candidates";

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
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCanViewKhoCatalog();

    // Lấy trực tiếp từ bảng DM để không phụ thuộc category của RPC registry.
    const [boRes, loaiRes, chiTietRes, hoaChatRes, khoaRes] = await Promise.all([
      supabase
        .from("v_cssd_bo_dung_cu_summary")
        .select("*")
        .eq("is_active", true)
        .order("ma_bo"),
      supabase
        .from("v_cssd_loai_dung_cu_summary")
        .select("*")
        .eq("is_active", true)
        .order("ma_loai_dung_cu"),
      supabase
        .from("v_cssd_bo_dung_cu_chi_tiet_full")
        .select("*")
        .eq("is_active", true)
        .order("ma_chi_tiet"),
      supabase.from("cssd_dm_hoa_chat").select("*").eq("is_active", true).order("ma_hoa_chat"),
      supabase.from("mdm_dm_khoa_phong").select("id, ten_khoa, ma_khoa"),
    ]);

    if (boRes.error) throw boRes.error;
    if (loaiRes.error) throw loaiRes.error;
    if (chiTietRes.error) throw chiTietRes.error;
    if (hoaChatRes.error) throw hoaChatRes.error;
    if (khoaRes.error) throw khoaRes.error;

    const khoaMap = new Map<string, string>(
      (khoaRes.data || []).map((x) => [String(x.id), String(x.ma_khoa || x.ten_khoa)] as const)
    );

    const bo: CSSDBo[] = (boRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ma_bo: String(x.ma_bo || ""),
      ten_bo: String(x.ten_bo || ""),
      loai_dung_cu_id: x.loai_dung_cu_id ? String(x.loai_dung_cu_id) : null,
      is_active: x.is_active !== false,
      phan_loai_bo: x.phan_loai_bo ? String(x.phan_loai_bo) : null,
      co_ma_dinh_danh_rieng: x.co_ma_dinh_danh_rieng !== false,
      so_luong_bo: x.so_luong_bo != null ? Number(x.so_luong_bo) : null,
      so_khoan: x.so_khoan != null ? Number(x.so_khoan) : null,
      tong_so_luong_dung_cu: x.tong_so_luong_dung_cu != null ? Number(x.tong_so_luong_dung_cu) : null,
      khoa_su_dung_id: x.khoa_su_dung_id ? String(x.khoa_su_dung_id) : null,
      ten_khoa: x.khoa_su_dung_id ? khoaMap.get(String(x.khoa_su_dung_id)) || null : null,
    }));

    const loai: CSSDLoai[] = (loaiRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ma_loai_dung_cu: String(x.ma_loai_dung_cu || x.ma_loai || ""),
      ten_loai_dung_cu: String(x.ten_loai_dung_cu || x.ten_loai || ""),
      is_active: x.is_active !== false,
      phan_loai: x.phan_loai ? String(x.phan_loai) : null,
      so_luong_kho_du_phong: x.so_luong_kho_du_phong != null ? Number(x.so_luong_kho_du_phong) : null,
      so_luong_tong: x.so_luong_tong != null ? Number(x.so_luong_tong) : null,
      hinh_dang: x.hinh_dang ? String(x.hinh_dang) : null,
      kich_thuoc: x.kich_thuoc ? String(x.kich_thuoc) : null,
      cong_dung: x.cong_dung ? String(x.cong_dung) : null,
      kha_nang_chiu_nhiet: x.kha_nang_chiu_nhiet ? String(x.kha_nang_chiu_nhiet) : null,
      phuong_phap_tiet_khuan: x.phuong_phap_tiet_khuan ? String(x.phuong_phap_tiet_khuan) : null,
    }));

    const boMap = new Map<string, string>(bo.map((x) => [x.id, x.ten_bo] as const));
    const loaiMap = new Map<string, string>(loai.map((x) => [x.id, x.ten_loai_dung_cu] as const));

    const chi_tiet: CSSDChiTiet[] = (chiTietRes.data || []).map((x) => {
      const specs = x.specs || {};
      const max_suds_count = specs.max_suds_count !== undefined && specs.max_suds_count !== null ? Number(specs.max_suds_count) : null;
      const trong_luong = specs.trong_luong !== undefined && specs.trong_luong !== null ? Number(specs.trong_luong) : null;
      const ma_qr_mau = specs.ma_qr_mau !== undefined && specs.ma_qr_mau !== null ? String(specs.ma_qr_mau) : null;
      return {
        id: String(x.id),
        ma_chi_tiet: String(x.ma_chi_tiet || ""),
        ten_chi_tiet: String(x.ten_chi_tiet || ""),
        so_luong: x.so_luong != null ? Number(x.so_luong) : null,
        bo_dung_cu_id: x.bo_dung_cu_id ? String(x.bo_dung_cu_id) : null,
        ten_bo: x.bo_dung_cu_id ? boMap.get(String(x.bo_dung_cu_id)) || null : null,
        loai_dung_cu_id: x.loai_dung_cu_id ? String(x.loai_dung_cu_id) : null,
        ten_loai: x.loai_dung_cu_id ? loaiMap.get(String(x.loai_dung_cu_id)) || null : null,
        is_active: x.is_active !== false,
        max_suds_count,
        trong_luong,
        ghi_chu: x.ghi_chu ? String(x.ghi_chu) : null,
        ma_qr_mau,
      };
    });

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

export async function lookupBoDungCuIdByQrAction(qrCode: string): Promise<
  { success: true; boDungCuId: string | null } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    const code = String(qrCode || "").trim().toUpperCase();
    if (!code) return { success: true, boDungCuId: null };

    const { data, error } = await supabase
      .from("cssd_fact_quy_trinh")
      .select("bo_dung_cu_id")
      .eq("ma_qr_quy_trinh", code)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (data?.bo_dung_cu_id) {
      return { success: true, boDungCuId: String(data.bo_dung_cu_id) };
    }

    return { success: true, boDungCuId: null };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

