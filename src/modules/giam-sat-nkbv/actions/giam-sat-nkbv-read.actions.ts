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

/** Danh sách Sự kiện NKBV có phân trang server (hook `useServerPaginatedTable`). */
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

  let countQ = supabase
    .from("v_nkbv_su_kien_full")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (searchFilter) countQ = countQ.or(searchFilter);
  if (filters.khoa_ghi_nhan_id) countQ = countQ.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id);

  let dataQ = supabase
    .from("v_nkbv_su_kien_full")
    .select("*")
    .eq("is_active", true)
    .order(sortCol, { ascending })
    .range(from, to);
  if (searchFilter) dataQ = dataQ.or(searchFilter);
  if (filters.khoa_ghi_nhan_id) dataQ = dataQ.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id);

  const [{ count, error: cErr }, { data, error: dErr }] = await Promise.all([countQ, dataQ]);

  if (cErr) return { success: false as const, error: cErr.message, data: [], totalCount: 0 };
  if (dErr) return { success: false as const, error: dErr.message, data: [], totalCount: 0 };

  const formatted = (data || []).map((r) => ({
    ...r,
    khoa_ghi_nhan: r.khoa_ma ? { ma_khoa: r.khoa_ma, ten_khoa: r.khoa_ten } : null,
    loai_nkbv: r.loai_ma ? { ma_loai: r.loai_ma, ten_loai: r.loai_ten } : null,
    trang_thai_row: r.trang_thai_ma ? { ma_trang_thai: r.trang_thai_ma, ten_trang_thai: r.trang_thai_ten } : null,
  }));

  return {
    success: true as const,
    data: formatted,
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

/** Gợi ý mã phiếu (NKddd) — đọc cùng sự kiện view. */
export async function listAllMaNkbvCas() {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("fact_nkbv_su_kien")
      .select("ma_ca")
      .eq("is_active", true);
    if (error) throw error;
    return { success: true as const, data: data || [] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi";
    return { success: false as const, error: msg };
  }
}

/** Danh sách hồ sơ bệnh án (stay pool) truy vấn phân trang từ bảng vật lý fact_nkbv_benh_an. */
export async function listNkbvMedicalRecords(params: {
  page: number;
  pageSize?: number;
  search?: string;
}) {
  const supabase = await createServerSupabaseUserClient();
  await verifyPermission("GIAM_SAT_NKBV", "view");

  const page = params.page || 1;
  const pageSize = params.pageSize || 15;
  const search = (params.search || "").trim().toLowerCase();

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const searchFilter = buildSupabaseSearchFilter(search, ["ma_benh_an", "ma_benh_nhan", "ho_ten_benh_nhan"]);

  let countQ = supabase
    .from("fact_nkbv_benh_an")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  if (searchFilter) countQ = countQ.or(searchFilter);

  let dataQ = supabase
    .from("fact_nkbv_benh_an")
    .select("*")
    .eq("is_active", true)
    .order("ngay_vao_vien", { ascending: false })
    .range(from, to);
  if (searchFilter) dataQ = dataQ.or(searchFilter);

  const [{ count, error: cErr }, { data: stays, error: dErr }] = await Promise.all([countQ, dataQ]);

  if (cErr) return { success: false as const, error: cErr.message, data: [], totalCount: 0 };
  if (dErr) return { success: false as const, error: dErr.message, data: [], totalCount: 0 };

  if (!stays || stays.length === 0) {
    return {
      success: true as const,
      data: [],
      totalCount: 0,
    };
  }

  const stayIds = stays.map((s) => s.ma_benh_an);

  // Fetch related vi sinh thô
  const { data: lisData, error: lErr } = await supabase
    .from("fact_nkbv_vi_sinh")
    .select("id, ma_benh_an, loai_benh_pham")
    .in("ma_benh_an", stayIds)
    .eq("is_active", true);

  if (lErr) return { success: false as const, error: lErr.message, data: [], totalCount: 0 };

  // Fetch related sự kiện nhiễm khuẩn
  const { data: casesData, error: caErr } = await supabase
    .from("v_nkbv_su_kien_full")
    .select("id, ma_benh_an, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten")
    .in("ma_benh_an", stayIds)
    .eq("is_active", true);

  if (caErr) return { success: false as const, error: caErr.message, data: [], totalCount: 0 };

  const formatted = stays.map((s) => {
    const lis_records = (lisData || [])
      .filter((l) => l.ma_benh_an === s.ma_benh_an)
      .map((r) => ({
        ...r,
        is_blood_culture: String(r.loai_benh_pham || "").toLowerCase().includes("máu") ||
                          String(r.loai_benh_pham || "").toLowerCase().includes("blood"),
      }));

    const nkbv_cases = (casesData || [])
      .filter((c) => c.ma_benh_an === s.ma_benh_an)
      .map((r) => ({
        ...r,
        loai_nkbv: r.loai_ma ? { ma_loai: r.loai_ma, ten_loai: r.loai_ten } : null,
        trang_thai_row: r.trang_thai_ma ? { ma_trang_thai: r.trang_thai_ma, ten_trang_thai: r.trang_thai_ten } : null,
      }));

    return {
      ...s,
      lis_records,
      nkbv_cases,
    };
  });

  return {
    success: true as const,
    data: formatted,
    totalCount: count ?? 0,
  };
}

