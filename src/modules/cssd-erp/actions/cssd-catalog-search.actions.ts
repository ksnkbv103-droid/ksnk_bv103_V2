"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { mapLoaiPhysicalToListRow, splitLoaiStock } from "@/lib/master-data/cssd-loai-list-map";
import { sumTrongBoByLoaiIds } from "@/lib/master-data/cssd-loai-trong-bo";
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

export type KhoLoaiStockFilter = "ALL" | "CO_DU_PHONG" | "HET_DU_PHONG";

export async function searchKhoCatalogLoaiAction(
  q: string,
  opts?: { page?: number; pageSize?: number; stockFilter?: KhoLoaiStockFilter },
): Promise<
  | { success: true; data: CSSDLoai[]; totalCount: number; page: number; pageSize: number }
  | { success: false; error: string }
> {
  try {
    await verifyCanViewKhoCatalog();
    const supabase = createAdminSupabaseClient();
    const pageSize = Math.min(Math.max(opts?.pageSize ?? PAGE, 1), 100);
    const page = Math.max(opts?.page ?? 1, 1);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const stockFilter = opts?.stockFilter ?? "ALL";

    const filter = buildSupabaseSearchFilter(q, ["ma_loai", "ten_loai"]);

    let countQ = supabase
      .from("cssd_dm_loai_dung_cu")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (stockFilter === "CO_DU_PHONG") countQ = countQ.gt("so_luong_kho_du_phong", 0);
    if (stockFilter === "HET_DU_PHONG") countQ = countQ.lte("so_luong_kho_du_phong", 0);
    if (filter) countQ = countQ.or(filter);
    const { count, error: cErr } = await countQ;
    if (cErr) throw cErr;

    let query = supabase
      .from("cssd_dm_loai_dung_cu")
      .select(
        "id, ma_loai, ten_loai, specs, is_active, is_chiu_nhiet, phan_loai, so_luong_kho_du_phong, phuong_phap_tiet_khuan_chi_dinh",
      )
      .eq("is_active", true);
    if (stockFilter === "CO_DU_PHONG") query = query.gt("so_luong_kho_du_phong", 0);
    if (stockFilter === "HET_DU_PHONG") query = query.lte("so_luong_kho_du_phong", 0);
    if (filter) query = query.or(filter);
    const { data, error } = await query.order("so_luong_kho_du_phong", { ascending: false }).order("ma_loai").range(from, to);
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
    const trongBo = ids.length ? await sumTrongBoByLoaiIds(supabase, ids) : new Map<string, number>();
    return {
      success: true,
      data: mapped.map((r) => ({
        ...r,
        ...splitLoaiStock(r.so_luong_kho_du_phong, trongBo.get(r.id) || 0),
      })),
      totalCount: count ?? 0,
      page,
      pageSize,
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
      .from("v_cssd_bo_dung_cu_chi_tiet_realtime")
      .select("so_luong_thuc_te, so_luong_tieu_chuan, bo_dung_cu_id, ma_bo, ten_bo")
      .eq("loai_dung_cu_id", id)
      .eq("is_active", true);
    if (error) throw error;

    const boIds = [
      ...new Set(
        (data || [])
          .map((r) => String((r as { bo_dung_cu_id?: string }).bo_dung_cu_id || "").trim())
          .filter(Boolean),
      ),
    ];
    if (!boIds.length) return { success: true, data: [] };

    const { data: bos, error: boErr } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo, is_active, phan_loai_bo, khoa_su_dung_id")
      .in("id", boIds)
      .eq("is_active", true);
    if (boErr) throw boErr;

    const khoaIds = [
      ...new Set(
        (bos || [])
          .map((b) => String((b as { khoa_su_dung_id?: string | null }).khoa_su_dung_id || "").trim())
          .filter(Boolean),
      ),
    ];
    const khoaMap = new Map<string, string>();
    if (khoaIds.length) {
      const { data: khoas } = await supabase
        .from("mdm_dm_khoa_phong")
        .select("id, ma_khoa, ten_khoa")
        .in("id", khoaIds);
      for (const k of khoas || []) {
        const kid = String((k as { id?: string }).id || "");
        const ma = String((k as { ma_khoa?: string }).ma_khoa || "").trim();
        const ten = String((k as { ten_khoa?: string }).ten_khoa || "").trim();
        if (kid) khoaMap.set(kid, ma && ten ? `${ma} — ${ten}` : ten || ma);
      }
    }

    const byId = new Map<string, CSSDBo>();
    for (const b of bos || []) {
      const bid = String((b as { id?: string }).id || "");
      if (!bid) continue;
      const kid = String((b as { khoa_su_dung_id?: string | null }).khoa_su_dung_id || "").trim();
      byId.set(bid, {
        id: bid,
        ma_bo: String((b as { ma_bo?: string }).ma_bo || ""),
        ten_bo: String((b as { ten_bo?: string }).ten_bo || ""),
        loai_dung_cu_id: null,
        is_active: true,
        phan_loai_bo: (b as { phan_loai_bo?: string | null }).phan_loai_bo
          ? String((b as { phan_loai_bo?: string }).phan_loai_bo)
          : null,
        khoa_su_dung_id: kid || null,
        ten_khoa: kid ? khoaMap.get(kid) || null : null,
        co_so_loai_dang_xem: 0,
      });
    }

    for (const row of data || []) {
      const bid = String((row as { bo_dung_cu_id?: string }).bo_dung_cu_id || "").trim();
      const existing = byId.get(bid);
      if (!existing) continue;
      const qty = Number((row as { so_luong_thuc_te?: number }).so_luong_thuc_te ?? 0);
      existing.co_so_loai_dang_xem = (existing.co_so_loai_dang_xem ?? 0) + qty;
    }

    return {
      success: true,
      data: [...byId.values()].sort((a, b) => String(a.ma_bo).localeCompare(String(b.ma_bo), "vi")),
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
