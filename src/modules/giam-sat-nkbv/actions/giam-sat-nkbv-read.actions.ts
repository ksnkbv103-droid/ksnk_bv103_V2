"use server";

import { createServerSupabaseUserClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import type { NkbvListSortKey } from "@/lib/validations/nkbv-list-pagination";
import { NKBV_LIST_SORT_KEYS, nkbvListPaginationSchema } from "@/lib/validations/nkbv-list-pagination";

type GiamSatNkbvFilters = {
  khoa_ghi_nhan_id?: string;
};

type ListGiamSatNkbvCasParams = GiamSatNkbvFilters & {
  page: number;
  pageSize?: number;
  search?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
};

function resolveSortColumn(key: string): NkbvListSortKey {
  return NKBV_LIST_SORT_KEYS.includes(key as NkbvListSortKey)
    ? (key as NkbvListSortKey)
    : "ngay_phat_hien";
}

/** Danh sách NKBV có phân trang server (hook `useServerPaginatedTable`). */
export async function listGiamSatNkbvCas(filters: ListGiamSatNkbvCasParams) {
  const supabase = await createServerSupabaseUserClient();
  await verifyPermission("GIAM_SAT_NKBV", "view");

  const parsed = nkbvListPaginationSchema.safeParse({
    page: filters.page,
    pageSize: 20,
    search: filters.search ?? "",
    sortKey: filters.sortKey ?? "ngay_phat_hien",
    sortDir: filters.sortDir ?? "desc",
  });
  if (!parsed.success) {
    return {
      success: false as const,
      error: "Tham số phân trang không hợp lệ",
      data: [] as unknown[],
      totalCount: 0,
    };
  }
  const { page, pageSize, search, sortKey, sortDir } = parsed.data;
  const sortCol = resolveSortColumn(sortKey);
  const ascending = sortDir === "asc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const searchFilter = buildSupabaseSearchFilter(search, ["ma_ca", "ho_ten_benh_nhan", "ma_benh_nhan"]);

  const sel = `
      *,
      khoa_ghi_nhan:dm_khoa_phong!khoa_ghi_nhan_id(ma_khoa, ten_khoa),
      loai_nkbv:dm_loai_nkbv!loai_nkbv_id(ma_loai, ten_loai),
      trang_thai_row:dm_trang_thai_nkbv_ca!trang_thai_id(ma_trang_thai, ten_trang_thai)
    `;

  let countQ = supabase
    .from("fact_giam_sat_nkbv_ca")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (searchFilter) countQ = countQ.or(searchFilter);
  if (filters.khoa_ghi_nhan_id) countQ = countQ.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id);

  let dataQ = supabase
    .from("fact_giam_sat_nkbv_ca")
    .select(sel)
    .eq("is_active", true)
    .order(sortCol, { ascending })
    .range(from, to);
  if (searchFilter) dataQ = dataQ.or(searchFilter);
  if (filters.khoa_ghi_nhan_id) dataQ = dataQ.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id);

  const [{ count, error: cErr }, { data, error: dErr }] = await Promise.all([countQ, dataQ]);

  if (cErr) return { success: false as const, error: cErr.message, data: [], totalCount: 0 };
  if (dErr) return { success: false as const, error: dErr.message, data: [], totalCount: 0 };

  return {
    success: true as const,
    data: data || [],
    totalCount: count ?? 0,
  };
}

export async function getNkbvFormDmBundle() {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
    const loaiRows = await fetchActiveRegistryDmRows(supabase, "LOAI_NKBV");
    const { data: ttData, error: ttErr } = await supabase
      .from("dm_trang_thai_nkbv_ca")
      .select("id, ma_trang_thai, ten_trang_thai, thu_tu")
      .eq("is_active", true)
      .order("thu_tu", { ascending: true });
    if (ttErr) throw ttErr;
    const trangThaiRows: RegistrySelectRow[] = (ttData || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      ma: String(row.ma_trang_thai ?? "").trim(),
      ten: String(row.ten_trang_thai ?? "").trim(),
    }));
    return {
      success: true as const,
      data: { loaiRows, trangThaiRows },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi tải danh mục NKBV";
    return { success: false as const, error: msg };
  }
}

/** Gợi ý mã phiếu (NKddd) — đọc cùng module view. */
export async function listAllMaNkbvCas() {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("fact_giam_sat_nkbv_ca")
      .select("ma_ca")
      .eq("is_active", true);
    if (error) throw error;
    return { success: true as const, data: data || [] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi";
    return { success: false as const, error: msg };
  }
}
