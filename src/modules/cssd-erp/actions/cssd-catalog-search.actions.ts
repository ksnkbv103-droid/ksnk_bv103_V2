"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { mapLoaiPhysicalToListRow, splitLoaiStock } from "@/lib/master-data/cssd-loai-list-map";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { CSSD_KHO_CATALOG_PERMISSION_CANDIDATES } from "../lib/cssd-catalog-permission-candidates";
import { getErrorMessage } from "../shared/cssd-db-utils";
import type { CSSDBo, CSSDChiTiet, CSSDLoai } from "../types/catalog.types";

async function verifyCanViewKhoCatalog(): Promise<void> {
  for (const [moduleKey, action] of CSSD_KHO_CATALOG_PERMISSION_CANDIDATES) {
    try {
      await verifyPermission(moduleKey, action);
      return;
    } catch {
      /* next */
    }
  }
  await verifyPermission("CSSD_KHO_DUNGCU", "view");
}

const PAGE = 20;

export async function searchKhoCatalogLoaiAction(q: string): Promise<
  { success: true; data: CSSDLoai[] } | { success: false; error: string }
> {
  try {
    await verifyCanViewKhoCatalog();
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("cssd_dm_loai_dung_cu")
      .select(
        "id, ma_loai, ten_loai, specs, is_active, is_chiu_nhiet, phan_loai, so_luong_kho_du_phong, phuong_phap_tiet_khuan_chi_dinh",
      )
      .eq("is_active", true);
    const filter = buildSupabaseSearchFilter(q, ["ma_loai", "ten_loai"]);
    if (filter) query = query.or(filter);
    const { data, error } = await query.order("ma_loai").limit(PAGE);
    if (error) throw error;
    const mapped = (data || []).map((x) => {
      const m = mapLoaiPhysicalToListRow(x as Record<string, unknown>);
      return {
        id: m.id,
        ma_loai_dung_cu: m.ma_danh_muc,
        ten_loai_dung_cu: m.ten_danh_muc,
        is_active: m.is_active,
        phan_loai: m.phan_loai,
        so_luong_kho_du_phong: m.so_luong_kho_du_phong,
        so_luong_trong_bo: 0,
        so_luong_tong: m.so_luong_kho_du_phong,
        hinh_dang: m.hinh_dang,
        kich_thuoc: m.kich_thuoc,
        cong_dung: m.cong_dung,
        kha_nang_chiu_nhiet: m.kha_nang_chiu_nhiet,
        phuong_phap_tiet_khuan: m.phuong_phap_tiet_khuan,
      };
    });
    const ids = mapped.map((r) => r.id);
    const trongBo = new Map<string, number>();
    if (ids.length) {
      const { data: setRows, error: setErr } = await supabase
        .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
        .select("loai_dung_cu_id, so_luong_thuc_te")
        .in("loai_dung_cu_id", ids)
        .eq("is_active", true);
      if (setErr) throw setErr;
      for (const row of setRows || []) {
        const id = String((row as { loai_dung_cu_id?: string }).loai_dung_cu_id || "");
        if (!id) continue;
        trongBo.set(id, (trongBo.get(id) || 0) + Number((row as { so_luong_thuc_te?: number }).so_luong_thuc_te || 0));
      }
    }
    return {
      success: true,
      data: mapped.map((r) => ({
        ...r,
        ...splitLoaiStock(r.so_luong_kho_du_phong, trongBo.get(r.id) || 0),
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export async function searchKhoCatalogChiTietAction(q: string): Promise<
  { success: true; data: CSSDChiTiet[] } | { success: false; error: string }
> {
  try {
    await verifyCanViewKhoCatalog();
    const supabase = createAdminSupabaseClient();
    let query = supabase
      .from("v_cssd_bo_dung_cu_chi_tiet_full")
      .select(
        "id, ma_chi_tiet, ten_chi_tiet, so_luong, bo_dung_cu_id, ten_bo, loai_dung_cu_id, ten_loai_dung_cu, is_active, specs, ghi_chu",
      )
      .eq("is_active", true);
    const filter = buildSupabaseSearchFilter(q, ["ma_chi_tiet", "ten_chi_tiet", "ten_bo", "ten_loai_dung_cu"]);
    if (filter) query = query.or(filter);
    const { data, error } = await query.order("ma_chi_tiet").limit(PAGE);
    if (error) throw error;
    return {
      success: true,
      data: (data || []).map((x) => {
        const specs = (x.specs || {}) as Record<string, unknown>;
        return {
          id: String(x.id),
          ma_chi_tiet: String(x.ma_chi_tiet || ""),
          ten_chi_tiet: String(x.ten_chi_tiet || ""),
          so_luong: x.so_luong != null ? Number(x.so_luong) : null,
          bo_dung_cu_id: x.bo_dung_cu_id ? String(x.bo_dung_cu_id) : null,
          ten_bo: x.ten_bo ? String(x.ten_bo) : null,
          loai_dung_cu_id: x.loai_dung_cu_id ? String(x.loai_dung_cu_id) : null,
          ten_loai: x.ten_loai_dung_cu ? String(x.ten_loai_dung_cu) : null,
          is_active: x.is_active !== false,
          max_suds_count: specs.max_suds_count != null ? Number(specs.max_suds_count) : null,
          trong_luong: specs.trong_luong != null ? Number(specs.trong_luong) : null,
          ghi_chu: x.ghi_chu ? String(x.ghi_chu) : null,
          ma_qr_mau: specs.ma_qr_mau != null ? String(specs.ma_qr_mau) : null,
        };
      }),
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

export async function getBosContainingLoaiAction(loaiId: string): Promise<
  { success: true; data: CSSDBo[] } | { success: false; error: string }
> {
  try {
    await verifyCanViewKhoCatalog();
    const id = String(loaiId || "").trim();
    if (!id) return { success: true, data: [] };
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("so_luong, bo:cssd_dm_bo_dung_cu!bo_dung_cu_id(id, ma_bo, ten_bo, is_active, phan_loai_bo, khoa_su_dung_id)")
      .eq("loai_dung_cu_id", id)
      .eq("is_active", true);
    if (error) throw error;
    const byId = new Map<string, CSSDBo>();
    for (const row of data || []) {
      const rel = (row as { bo?: Record<string, unknown> | Record<string, unknown>[] | null }).bo;
      const bo = Array.isArray(rel) ? rel[0] : rel;
      if (!bo?.id || bo.is_active === false) continue;
      const qty = Number((row as { so_luong?: number | null }).so_luong ?? 1);
      const existing = byId.get(String(bo.id));
      if (existing) {
        existing.co_so_loai_dang_xem = (existing.co_so_loai_dang_xem ?? 0) + qty;
        continue;
      }
      byId.set(String(bo.id), {
        id: String(bo.id),
        ma_bo: String(bo.ma_bo || ""),
        ten_bo: String(bo.ten_bo || ""),
        loai_dung_cu_id: null,
        is_active: true,
        phan_loai_bo: bo.phan_loai_bo ? String(bo.phan_loai_bo) : null,
        co_so_loai_dang_xem: qty,
      });
    }
    return { success: true, data: [...byId.values()] };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
