"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { type NhanSu } from "../types";
import { verifyPermission } from "../../actions/verify-permission";
import { buildNhanSuExportRows } from "./nhan-su-read-export-rows";
import { errNhanSu } from "./nhan-su-read-errors";
import { enrichNhanSuListRows } from "./nhan-su-read-list-enrich";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";

/**
 * Lấy danh sách nhân sự với tìm kiếm và phân trang
 */
export async function getNhanSus(params: {
  search?: string;
  khoaId?: string;
  toId?: string;
  chucVuId?: string;
  chucDanhId?: string;
  vaiTroId?: string;
  ngheNghiepId?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("NHAN_SU", "view");
    const { search, khoaId, toId, chucVuId, chucDanhId, vaiTroId, ngheNghiepId, page = 1, pageSize = 20 } = params;
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase
      .from("v_mdm_nhan_su_full")
      .select("*", { count: "exact" });

    const searchFilter = buildSupabaseSearchFilter(search, [
      "ho_ten",
      "ma_nv",
      "email",
      "so_dien_thoai",
      "chuc_vu",
      "chuc_danh",
      "vai_tro_he_thong_ksnk"
    ]);

    if (searchFilter) {
      query = query.or(searchFilter);
    }

    if (khoaId && khoaId !== "Tất cả") {
      query = query.eq("khoa_id", khoaId);
    }
    if (toId && toId !== "Tất cả") {
      query = query.eq("to_id", toId);
    }
    if (chucVuId && chucVuId !== "Tất cả") {
      query = query.eq("chuc_vu_id", chucVuId);
    }
    if (chucDanhId && chucDanhId !== "Tất cả") {
      query = query.eq("chuc_danh_id", chucDanhId);
    }
    if (vaiTroId && vaiTroId !== "Tất cả") {
      query = query.eq("vai_tro_he_thong_id", vaiTroId);
    }
    if (ngheNghiepId && ngheNghiepId !== "Tất cả") {
      query = query.eq("nghe_nghiep_id", ngheNghiepId);
    }

    const { data, error, count } = await query
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) throw error;
    const enriched = await enrichNhanSuListRows(data || []);

    return {
      success: true,
      data: enriched as NhanSu[],
      total: count || 0,
      totalCount: count || 0,
      page,
      pageSize
    };
  } catch (error: unknown) {
    console.error("Lỗi getNhanSus:", errNhanSu(error));
    return { success: false, error: "Không thể tải danh sách nhân sự" };
  }
}

/**
 * Lấy toàn bộ mã nhân viên để phục vụ sinh mã tự động
 */
export async function getAllMaNhanSu() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("NHAN_SU", "view");
    const { data, error } = await supabase
      .from("mdm_nhan_su")
      .select("ma_nv");
    if (error) throw error;
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: errNhanSu(error) };
  }
}

/**
 * Lấy toàn bộ nhân sự để Export
 */
export async function getNhanSuExportData() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("NHAN_SU", "view");
    const { data, error } = await supabase
      .from("v_mdm_nhan_su_full")
      .select("*")
      .order("is_active", { ascending: false })
      .order("ma_nv");
    if (error) throw error;
    const rows = (data || []) as NhanSu[];
    const exportRows = await buildNhanSuExportRows(supabase, rows);
    return {
      success: true,
      data: exportRows,
    };
  } catch (error: unknown) {
    return { success: false, error: errNhanSu(error) };
  }
}

import { getCachedDmKhoaPhong, getCachedDmNgheNghiep } from "@/lib/cache/master-data-cache";

/**
 * Lấy danh mục dùng cho form Nhân sự.
 * Tối ưu bằng Cache layer cho các danh mục master data.
 */
export async function getNhanSuFormOptionsAction() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("NHAN_SU", "view");
    
    // Lấy Khoa và Nghề nghiệp từ Cache
    const [khoaData, ngheData, registryRes] = await Promise.all([
      getCachedDmKhoaPhong(),
      getCachedDmNgheNghiep(),
      supabase.rpc("rpc_get_registry_options", {
        p_categories: ["CHUC_DANH", "CHUC_VU", "TO_CONG_TAC", "ROLE"],
      }),
    ]);

    if (registryRes.error) throw registryRes.error;
    const registry = registryRes.data as Record<string, any[]>;

    return {
      success: true as const,
      data: {
        khoas: khoaData.map((k) => ({
          id: k.id,
          ma_danh_muc: k.ma_khoa,
          ten_danh_muc: k.ten_khoa,
        })),
        chucDanhs: (registry.CHUC_DANH || []).map((x) => ({
          id: x.id,
          ten_danh_muc: x.ten,
        })),
        chucVus: (registry.CHUC_VU || []).map((x) => ({
          id: x.id,
          ten_danh_muc: x.ten,
        })),
        tos: (registry.TO_CONG_TAC || []).map((x) => ({ id: x.id, ten_danh_muc: x.ten })),
        vaiTros: (registry.ROLE || []).map((x) => ({
          id: x.id,
          ten_danh_muc: x.ten,
        })),
        ngheNghieps: ngheData.map((x) => ({
          id: x.id,
          ten_danh_muc: x.ten_nghe_nghiep,
        })),
      },
    };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: errNhanSu(error) || "Không tải được danh mục form nhân sự.",
    };
  }
}
