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

type SbAdmin = ReturnType<typeof createAdminSupabaseClient>;

type BoDmRow = { id: string; ma_bo: string | null; ten_bo: string | null };
type LoaiDmMapped = { id: string; ma_danh_muc: string | null; ten_danh_muc: string | null };

const IN_CHUNK = 120;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Tránh URL PostgREST quá dài khi `.in("id", …)` nhiều UUID. */
async function fetchDmBoByIdsChunked(supabase: SbAdmin, ids: string[]) {
  const map = new Map<string, BoDmRow>();
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += IN_CHUNK) {
    const part = uniq.slice(i, i + IN_CHUNK);
    const { data: bos, error: boErr } = await supabase
      .from("dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo")
      .in("id", part);
    if (boErr) throw new Error(boErr.message);
    for (const x of bos || []) map.set(String(x.id), x as BoDmRow);
  }
  return map;
}

async function fetchDmLoaiByIdsChunked(supabase: SbAdmin, ids: string[]) {
  const map = new Map<string, LoaiDmMapped>();
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += IN_CHUNK) {
    const part = uniq.slice(i, i + IN_CHUNK);
    const { data: loais, error: loaiErr } = await supabase
      .from("dm_loai_dung_cu")
      .select("id, ma_loai, ma_loai_dung_cu, ten_loai, ten_loai_dung_cu")
      .in("id", part);
    if (loaiErr) throw new Error(loaiErr.message);
    for (const x of loais || []) {
      const ma = x.ma_loai_dung_cu ?? x.ma_loai ?? null;
      const ten = x.ten_loai_dung_cu ?? x.ten_loai ?? null;
      map.set(String(x.id), {
        id: String(x.id),
        ma_danh_muc: ma != null ? String(ma) : null,
        ten_danh_muc: ten != null ? String(ten) : null,
      });
    }
  }
  return map;
}

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
    let query = supabase.from("dm_bo_dung_cu_chi_tiet").select("*", { count: "exact" });
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
  const boIds = [...new Set(rows.map((r) => String(r.bo_dung_cu_id || "").trim()).filter(Boolean))];
  const loaiIds = [...new Set(rows.map((r) => String(r.loai_dung_cu_id || "").trim()).filter(Boolean))];
  let boMap = new Map<string, BoDmRow>();
  let loaiMap = new Map<string, LoaiDmMapped>();
  try {
    if (boIds.length) boMap = await fetchDmBoByIdsChunked(supabase, boIds);
    if (loaiIds.length) loaiMap = await fetchDmLoaiByIdsChunked(supabase, loaiIds);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
  const enriched = rows.map((r) => ({
    ...r,
    bo_dung_cu: r.bo_dung_cu_id ? boMap.get(String(r.bo_dung_cu_id)) ?? null : null,
    loai_dung_cu: r.loai_dung_cu_id ? loaiMap.get(String(r.loai_dung_cu_id)) ?? null : null,
  }));
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
  let finalMaLoai: string | null = null;
  if (!finalTen && loaiRaw) {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("dm_loai_dung_cu")
      .select("ten_loai_dung_cu, ten_loai, ma_loai_dung_cu, ma_loai")
      .eq("id", loaiRaw)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    finalTen = String(data?.ten_loai_dung_cu || data?.ten_loai || "").trim();
    finalMaLoai = String(data?.ma_loai_dung_cu || data?.ma_loai || "").trim() || null;
  } else if (loaiRaw) {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("dm_loai_dung_cu")
      .select("ma_loai_dung_cu, ma_loai")
      .eq("id", loaiRaw)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    finalMaLoai = String(data?.ma_loai_dung_cu || data?.ma_loai || "").trim() || null;
  }
  if (!finalTen) return { success: false as const, error: "Không xác định được tên chi tiết." };

  const payload: Record<string, unknown> = {
    ma_chi_tiet: ma,
    ten_chi_tiet: finalTen,
    ten_dung_cu_le: finalTen,
    bo_dung_cu_id: boRaw ? boRaw : null,
    loai_dung_cu_id: loaiRaw || null,
    ma_loai: finalMaLoai,
    so_luong: soLuong,
    max_suds_count: suds === null ? 100 : suds,
    trong_luong: finalTrong,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    ma_qr_mau: String(input.ma_qr_mau || "").trim() || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
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
