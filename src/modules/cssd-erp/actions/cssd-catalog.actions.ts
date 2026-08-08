"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { Catalog, CSSDBo, CSSDChiTiet, CSSDLoai, CSSDHoaChat } from "../types/catalog.types";

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
    const [boRes, boMetaRes, loaiRes, chiTietRes, hoaChatRes, khoaRes] = await Promise.all([
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
        .from("v_cssd_loai_dung_cu_summary")
        .select(
          "id, ma_loai_dung_cu, ma_loai, ten_loai_dung_cu, ten_loai, is_active, phan_loai, so_luong_kho_du_phong, so_luong_tong, hinh_dang, kich_thuoc, cong_dung, is_chiu_nhiet, phuong_phap_tiet_khuan",
        )
        .eq("is_active", true)
        .order("ma_loai_dung_cu"),
      supabase
        .from("v_cssd_bo_dung_cu_chi_tiet_full")
        .select("id, ma_chi_tiet, ten_chi_tiet, so_luong, bo_dung_cu_id, loai_dung_cu_id, is_active, specs, ghi_chu")
        .eq("is_active", true)
        .order("ma_chi_tiet"),
      supabase
        .from("cssd_dm_hoa_chat")
        .select("id, ma_hoa_chat, ten_hoa_chat, loai_hoa_chat, don_vi_tinh, is_active")
        .eq("is_active", true)
        .order("ma_hoa_chat"),
      supabase.from("mdm_dm_khoa_phong").select("id, ten_khoa, ma_khoa"),
    ]);

    if (boRes.error) throw boRes.error;
    if (boMetaRes.error) throw boMetaRes.error;
    if (loaiRes.error) throw loaiRes.error;
    if (chiTietRes.error) throw chiTietRes.error;
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
      kha_nang_chiu_nhiet:
        x.is_chiu_nhiet === true ? "Có" : x.is_chiu_nhiet === false ? "Không" : null,
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

