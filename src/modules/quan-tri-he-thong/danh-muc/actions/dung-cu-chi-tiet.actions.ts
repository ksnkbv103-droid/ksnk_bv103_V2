"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";

type ChiTietRaw = Record<string, unknown> & {
  id: string;
  bo_dung_cu_id?: string | null;
  loai_dung_cu_id?: string | null;
  ma_loai?: string | null;
};


const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;



function normalizePageSize(raw: number | undefined) {
  if (!Number.isFinite(raw)) return DEFAULT_PAGE_SIZE;
  const safe = Math.floor(Number(raw));
  return Math.min(MAX_PAGE_SIZE, Math.max(1, safe));
}

function normalizePage(raw: number | undefined) {
  if (!Number.isFinite(raw)) return 1;
  return Math.max(1, Math.floor(Number(raw)));
}

/** Danh sách chi tiết + map tên bộ (không dùng embed PostgREST). */
export async function getDungCuChiTietRowsAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}) {
  await verifyPermission("DC_LE", "view");
  const supabase = createAdminSupabaseClient();
  const page = normalizePage(params?.page);
  const pageSize = normalizePageSize(params?.pageSize);
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const search = String(params?.search || "").trim();
  const sortDir: "asc" | "desc" = params?.sortDir === "asc" ? "asc" : "desc";
  const sortKey =
    params?.sortKey === "ma_chi_tiet" || params?.sortKey === "ten_chi_tiet" || params?.sortKey === "created_at"
      ? params.sortKey
      : "created_at";
  let rows: ChiTietRaw[] = [];
  let totalCount = 0;
  try {
    let query = supabase.from("v_cssd_bo_dung_cu_chi_tiet_full").select("*", { count: "exact" });
    if (search) {
      const esc = search.replace(/%/g, "\\%").replace(/_/g, "\\_");
      query = query.or(
        `ma_chi_tiet.ilike.%${esc}%,ten_chi_tiet.ilike.%${esc}%,ten_dung_cu_le.ilike.%${esc}%`,
      );
    }
    const { data, error, count } = await query
      .order("is_active", { ascending: false })
      .order(sortKey, { ascending: sortDir === "asc" })
      .range(start, end);
    if (error) throw new Error(error.message);
    rows = (data || []) as ChiTietRaw[];
    totalCount = count ?? 0;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }

  const enriched = rows.map((r) => {
    const specsObj = r.specs && typeof r.specs === "object" ? r.specs : {};
    const max_suds_count = (specsObj as any).max_suds_count != null ? Number((specsObj as any).max_suds_count) : 100;
    const trong_luong = (specsObj as any).trong_luong != null ? String((specsObj as any).trong_luong) : null;
    const ma_qr_mau = (specsObj as any).ma_qr_mau != null ? String((specsObj as any).ma_qr_mau) : null;

    return {
      ...r,
      max_suds_count,
      trong_luong,
      ma_qr_mau,
      bo_dung_cu: r.bo_dung_cu_id
        ? { id: r.bo_dung_cu_id, ma_bo: (r as any).ma_bo, ten_bo: (r as any).ten_bo }
        : null,
      loai_dung_cu: r.loai_dung_cu_id
        ? { id: r.loai_dung_cu_id, ma_danh_muc: (r as any).ma_loai_dung_cu, ten_danh_muc: (r as any).ten_loai_dung_cu }
        : null,
    };
  });
  return { success: true as const, data: enriched, totalCount, page, pageSize };
}

export async function getBoDungCuOptionsForChiTietAction() {
  await verifyPermission("DC_LE", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("dm_bo_dung_cu")
    .select("id, ma_bo, ten_bo")
    .eq("is_active", true)
    .order("ma_bo", { ascending: true });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data || [] };
}

export async function getLoaiDungCuOptionsForChiTietAction() {
  await verifyPermission("DC_LE", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "LOAI_DUNG_CU");
    return {
      success: true as const,
      data: rows.map((r) => ({ id: r.id, ma_danh_muc: r.ma, ten_danh_muc: r.ten })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function saveDungCuChiTietAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("DC_LE", id ? "edit" : "create");
  const ma = String(input.ma_chi_tiet || "").trim().toUpperCase();
  const ten = String(input.ten_chi_tiet || "").trim();
  const boRaw = String(input.bo_dung_cu_id || "").trim();
  const loaiRaw = String(input.loai_dung_cu_id || "").trim();
  const soLuongRaw = Number(input.so_luong);
  const soLuong =
    Number.isFinite(soLuongRaw) && soLuongRaw >= 1 ? Math.floor(soLuongRaw) : 1;
  const sudsRaw = input.max_suds_count;
  const sudsParsed = Number(sudsRaw);
  const suds =
    sudsRaw === "" || sudsRaw === undefined || sudsRaw === null
      ? null
      : Number.isFinite(sudsParsed)
        ? Math.max(0, Math.floor(sudsParsed))
        : 100;
  const tlRaw = String(input.trong_luong || "").trim().replace(",", ".");
  const tlNum = tlRaw === "" ? NaN : Number(tlRaw);
  const finalTrong =
    tlRaw === "" || !Number.isFinite(tlNum) ? null : tlNum;

  if (!ma) {
    return { success: false as const, error: "Thiếu mã chi tiết dụng cụ." };
  }
  if (!ten && !loaiRaw) return { success: false as const, error: "Thiếu tên hoặc liên kết loại dụng cụ." };

  let finalTen = ten;
  if (!finalTen && loaiRaw) {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("dm_loai_dung_cu")
      .select("ten_loai, ma_loai, specs")
      .eq("id", loaiRaw)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    const specsObj = data?.specs && typeof data.specs === "object" ? data.specs : {};
    finalTen = String((specsObj as any).ten_loai_dung_cu || data?.ten_loai || "").trim();
  }
  if (!finalTen) return { success: false as const, error: "Không xác định được tên chi tiết." };

  const payload: Record<string, unknown> = {
    ten_chi_tiet: finalTen,
    ten_dung_cu_le: finalTen,
    bo_dung_cu_id: boRaw ? boRaw : null,
    loai_dung_cu_id: loaiRaw || null,
    so_luong: soLuong,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
    specs: {
      ma_chi_tiet: ma,
      max_suds_count: suds === null ? 100 : suds,
      trong_luong: finalTrong,
      ma_qr_mau: String(input.ma_qr_mau || "").trim() || null,
    }
  };

  return upsertMasterRow("dm_bo_dung_cu_chi_tiet", id, payload);
}

export async function toggleDungCuChiTietStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("DC_LE", "edit");
  return toggleMasterStatus("dm_bo_dung_cu_chi_tiet", id, currentStatus);
}

export async function softDeleteDungCuChiTietAction(id: string) {
  await verifyPermission("DC_LE", "delete");
  return softDeleteMasterRow("dm_bo_dung_cu_chi_tiet", id);
}

export async function softDeleteManyDungCuChiTietAction(ids: string[]) {
  await verifyPermission("DC_LE", "delete");
  return softDeleteManyMasterRows("dm_bo_dung_cu_chi_tiet", ids);
}
