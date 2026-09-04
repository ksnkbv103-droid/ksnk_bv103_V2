"use server";

import { createServerSupabaseUserClient, createAdminSupabaseClient } from "@/lib/supabase-server";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import { verifyAnyPermission, verifyPermission } from "@/lib/server-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import type { RegistrySelectRow } from "@/lib/master-data/registry-select-fetch";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import type { NkbvListSortKey } from "@/lib/validations/nkbv-list-pagination";
import { NKBV_LIST_SORT_KEYS, nkbvListPaginationSchema } from "@/lib/validations/nkbv-list-pagination";
import { scanStayCrossCaseAlerts } from "../lib/nkbv-import-window-scan";
import { mergeBaTimelineMilestones } from "../lib/nkbv-ba-timeline-core";
import { resolveNkbvMajorType } from "../lib/nkbv-major-type";
import { countChuaPhanTich } from "../lib/nkbv-vi-sinh-analysis-status";

type GiamSatNkbvFilters = {
  khoa_ghi_nhan_id?: string;
  loai_nkbv_id?: string;
  trang_thai_id?: string;
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
    loai_nkbv_id: filters.loai_nkbv_id || undefined,
    trang_thai_id: filters.trang_thai_id || undefined,
  });
  if (!parsed.success) {
    return {
      success: false as const,
      error: "Tham số phân trang không hợp lệ",
      data: [] as unknown[],
      totalCount: 0,
    };
  }
  const { page, pageSize, search, sortKey, sortDir, loai_nkbv_id, trang_thai_id } = parsed.data;
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
  if (loai_nkbv_id) countQ = countQ.eq("loai_nkbv_id", loai_nkbv_id);
  if (trang_thai_id) countQ = countQ.eq("trang_thai_id", trang_thai_id);

  let dataQ = supabase
    .from("v_nkbv_su_kien_full")
    .select("*")
    .eq("is_active", true)
    .order(sortCol, { ascending })
    .range(from, to);
  if (searchFilter) dataQ = dataQ.or(searchFilter);
  if (filters.khoa_ghi_nhan_id) dataQ = dataQ.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id);
  if (loai_nkbv_id) dataQ = dataQ.eq("loai_nkbv_id", loai_nkbv_id);
  if (trang_thai_id) dataQ = dataQ.eq("trang_thai_id", trang_thai_id);

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
      .from("nkbv_dm_trang_thai_ca")
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

/** Một sự kiện NKBV theo UUID — deep-link `?case=` / quét QR. */
export async function getGiamSatNkbvCaById(caseId: string) {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
    const id = String(caseId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã phiếu" };
    const supabase = await createServerSupabaseUserClient();
    const { data, error } = await supabase
      .from("v_nkbv_su_kien_full")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { success: false as const, error: "Không tìm thấy phiếu NKBV" };
    const r = data as Record<string, unknown>;
    return {
      success: true as const,
      data: {
        ...r,
        khoa_ghi_nhan: r.khoa_ma ? { ma_khoa: r.khoa_ma, ten_khoa: r.khoa_ten } : null,
        loai_nkbv: r.loai_ma ? { ma_loai: r.loai_ma, ten_loai: r.loai_ten } : null,
        trang_thai_row: r.trang_thai_ma
          ? { ma_trang_thai: r.trang_thai_ma, ten_trang_thai: r.trang_thai_ten }
          : null,
      },
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi tải phiếu NKBV";
    return { success: false as const, error: msg };
  }
}

/** Gợi ý mã phiếu (NKddd) — đọc cùng sự kiện view. */
export async function listAllMaNkbvCas() {
  try {
    await verifyPermission("GIAM_SAT_NKBV", "view");
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("nkbv_fact_su_kien")
      .select("ma_ca")
      .eq("is_active", true);
    if (error) throw error;
    return { success: true as const, data: data || [] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi";
    return { success: false as const, error: msg };
  }
}

/** Danh sách hồ sơ bệnh án (stay pool) truy vấn phân trang từ bảng vật lý nkbv_fact_benh_an. */
export async function listNkbvMedicalRecords(params: {
  page: number;
  pageSize?: number;
  search?: string;
  inpatientOnly?: boolean;
  /** Chỉ BA còn nằm viện đang có CVC/Foley/Vent active (trọng điểm xâm lấn). */
  devicePriorityOnly?: boolean;
  /** Chỉ BA còn ≥1 XN (+) chưa phân tích / chưa bỏ qua */
  chuaPhanTichOnly?: boolean;
  khoaId?: string | null;
}) {
  const supabase = await createServerSupabaseUserClient();
  await verifyPermission("GIAM_SAT_NKBV", "view");

  const page = params.page || 1;
  const pageSize = params.pageSize || 15;
  const search = (params.search || "").trim().toLowerCase();
  const khoaId = params.khoaId ? String(params.khoaId).trim() : "";

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const searchFilter = buildSupabaseSearchFilter(search, ["ma_benh_an", "ma_benh_nhan", "ho_ten_benh_nhan"]);

  let countQ = supabase
    .from("nkbv_fact_benh_an")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  let dataQ = supabase
    .from("nkbv_fact_benh_an")
    .select("*")
    .eq("is_active", true)
    .order("ngay_vao_vien", { ascending: false })
    .range(from, to);
  if (params.inpatientOnly || params.devicePriorityOnly) {
    countQ = countQ.is("ngay_ra_vien", null);
    dataQ = dataQ.is("ngay_ra_vien", null);
  }
  if (params.devicePriorityOnly) {
    const { data: devRows, error: devErr } = await supabase
      .from("nkbv_fact_ba_ngay_dung_cu")
      .select("ma_benh_an")
      .limit(3000);
    if (devErr) return { success: false as const, error: devErr.message, data: [], totalCount: 0 };
    const priorityBas = Array.from(
      new Set((devRows || []).map((r) => String(r.ma_benh_an || "").trim()).filter(Boolean)),
    );
    if (!priorityBas.length) {
      return { success: true as const, data: [], totalCount: 0 };
    }
    countQ = countQ.in("ma_benh_an", priorityBas);
    dataQ = dataQ.in("ma_benh_an", priorityBas);
  }
  if (params.chuaPhanTichOnly) {
    const { data: posRows, error: posErr } = await supabase
      .from("nkbv_fact_vi_sinh")
      .select("id, ma_benh_an, ket_qua_phan_loai, ket_qua_duong_tinh, tac_nhan, metadata")
      .eq("is_active", true)
      .limit(8000);
    if (posErr) return { success: false as const, error: posErr.message, data: [], totalCount: 0 };
    const positives = (posRows || []).filter((r) => {
      const pl = String(r.ket_qua_phan_loai || "").toUpperCase();
      if (pl === "AM_TINH") return false;
      if (pl === "DUONG_TINH" || r.ket_qua_duong_tinh === true) return true;
      return Boolean(r.tac_nhan) && pl !== "AM_TINH";
    });
    const { data: caseRows } = await supabase
      .from("nkbv_fact_su_kien")
      .select("verification_data, is_active")
      .eq("is_active", true)
      .limit(8000);
    const dispositions = [
      ...(caseRows || []).map((c) => {
        const vd =
          c.verification_data && typeof c.verification_data === "object"
            ? (c.verification_data as Record<string, unknown>)
            : {};
        return {
          index_vi_sinh_id: vd.index_vi_sinh_id ? String(vd.index_vi_sinh_id) : null,
          analysis_disposition: vd.analysis_disposition === "BO_QUA" ? ("BO_QUA" as const) : null,
          is_active: true as boolean | null,
        };
      }),
      ...positives
        .filter((r) => {
          const meta =
            r.metadata && typeof r.metadata === "object"
              ? (r.metadata as Record<string, unknown>)
              : {};
          return meta.analysis_disposition === "BO_QUA";
        })
        .map((r) => ({
          index_vi_sinh_id: String(r.id),
          analysis_disposition: "BO_QUA" as const,
          is_active: true as boolean | null,
        })),
    ];
    const byBa = new Map<string, string[]>();
    for (const r of positives) {
      const ba = String(r.ma_benh_an || "").trim();
      if (!ba) continue;
      const arr = byBa.get(ba) || [];
      arr.push(String(r.id));
      byBa.set(ba, arr);
    }
    const chuaBas: string[] = [];
    for (const [ba, ids] of byBa) {
      if (countChuaPhanTich(ids, dispositions) > 0) chuaBas.push(ba);
    }
    if (!chuaBas.length) {
      return { success: true as const, data: [], totalCount: 0 };
    }
    countQ = countQ.in("ma_benh_an", chuaBas);
    dataQ = dataQ.in("ma_benh_an", chuaBas);
  }
  if (khoaId) {
    countQ = countQ.eq("khoa_dieu_tri_id", khoaId);
    dataQ = dataQ.eq("khoa_dieu_tri_id", khoaId);
  }
  if (searchFilter) {
    countQ = countQ.or(searchFilter);
    dataQ = dataQ.or(searchFilter);
  }

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
    .from("nkbv_fact_vi_sinh")
    .select(
      "id, ma_benh_an, loai_benh_pham, ket_qua_phan_loai, ket_qua_duong_tinh, tac_nhan, metadata",
    )
    .in("ma_benh_an", stayIds)
    .eq("is_active", true);

  if (lErr) return { success: false as const, error: lErr.message, data: [], totalCount: 0 };

  // Fetch related sự kiện nhiễm khuẩn
  const { data: casesData, error: caErr } = await supabase
    .from("v_nkbv_su_kien_full")
    .select(
      "id, ma_benh_an, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten, verification_data",
    )
    .in("ma_benh_an", stayIds)
    .eq("is_active", true);

  if (caErr) return { success: false as const, error: caErr.message, data: [], totalCount: 0 };

  const pageDispositions = [
    ...(casesData || []).map((c) => {
      const vd =
        c.verification_data && typeof c.verification_data === "object"
          ? (c.verification_data as Record<string, unknown>)
          : {};
      return {
        index_vi_sinh_id: vd.index_vi_sinh_id ? String(vd.index_vi_sinh_id) : null,
        analysis_disposition: vd.analysis_disposition === "BO_QUA" ? ("BO_QUA" as const) : null,
        is_active: true as boolean | null,
      };
    }),
    ...(lisData || [])
      .filter((r) => {
        const meta =
          r.metadata && typeof r.metadata === "object"
            ? (r.metadata as Record<string, unknown>)
            : {};
        return meta.analysis_disposition === "BO_QUA";
      })
      .map((r) => ({
        index_vi_sinh_id: String(r.id),
        analysis_disposition: "BO_QUA" as const,
        is_active: true as boolean | null,
      })),
  ];

  const formatted = stays.map((s) => {
    const lis_records = (lisData || [])
      .filter((l) => l.ma_benh_an === s.ma_benh_an)
      .map((r) => ({
        ...r,
        is_blood_culture: String(r.loai_benh_pham || "").toLowerCase().includes("máu") ||
                          String(r.loai_benh_pham || "").toLowerCase().includes("blood"),
      }));

    const posIds = lis_records
      .filter((r) => {
        const pl = String(r.ket_qua_phan_loai || "").toUpperCase();
        if (pl === "AM_TINH") return false;
        if (pl === "DUONG_TINH" || r.ket_qua_duong_tinh === true) return true;
        return Boolean(r.tac_nhan) && pl !== "AM_TINH";
      })
      .map((r) => String(r.id));
    const chua_phan_tich_count = countChuaPhanTich(posIds, pageDispositions);

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
      chua_phan_tich_count,
    };
  });

  return {
    success: true as const,
    data: formatted,
    totalCount: count ?? 0,
  };
}

export type NkbvInpatientRow = {
  ma_benh_an: string;
  ma_benh_nhan: string;
  ho_ten_benh_nhan: string;
  ngay_vao_vien: string | null;
  khoa_dieu_tri_id: string | null;
  so_giuong?: string | null;
};

/**
 * BN còn nằm viện theo khoa — dùng chung NKBV + GSC tuân thủ (dropdown đối tượng BN).
 */
export async function listInpatientsByKhoa(params: {
  khoaId: string;
  search?: string;
  limit?: number;
}) {
  await verifyAnyPermission([
    { moduleKey: "GIAM_SAT_NKBV", action: "view" },
    { moduleKey: "GIAM_SAT_CHUNG", action: "view" },
  ]);

  const khoaId = String(params.khoaId || "").trim();
  if (!khoaId) return { success: false as const, error: "Thiếu khoa", data: [] as NkbvInpatientRow[] };

  const supabase = await createServerSupabaseUserClient();
  const limit = Math.min(Math.max(params.limit || 200, 1), 500);
  const search = (params.search || "").trim().toLowerCase();
  const searchFilter = buildSupabaseSearchFilter(search, ["ma_benh_an", "ma_benh_nhan", "ho_ten_benh_nhan"]);

  let q = supabase
    .from("nkbv_fact_benh_an")
    .select("ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_vao_vien, khoa_dieu_tri_id")
    .eq("is_active", true)
    .is("ngay_ra_vien", null)
    .eq("khoa_dieu_tri_id", khoaId)
    .order("ho_ten_benh_nhan", { ascending: true })
    .limit(limit);
  if (searchFilter) q = q.or(searchFilter);

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message, data: [] as NkbvInpatientRow[] };

  return {
    success: true as const,
    data: (data || []).map(
      (r): NkbvInpatientRow => ({
        ma_benh_an: String(r.ma_benh_an || ""),
        ma_benh_nhan: String(r.ma_benh_nhan || ""),
        ho_ten_benh_nhan: String(r.ho_ten_benh_nhan || ""),
        ngay_vao_vien: r.ngay_vao_vien ? String(r.ngay_vao_vien) : null,
        khoa_dieu_tri_id: r.khoa_dieu_tri_id ? String(r.khoa_dieu_tri_id) : null,
        so_giuong: null,
      }),
    ),
  };
}

/** Hồ sơ bệnh án theo mã BA — nguồn ngày vào viện cho HAI/POA trên phiếu xác định ca. */
export async function getNkbvBenhAnByMa(maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const ma = String(maBenhAn || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };

  const supabase = await createServerSupabaseUserClient();
  const { data, error } = await supabase
    .from("nkbv_fact_benh_an")
    .select(
      "id, ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh, ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, ket_cuc_dieu_tri, ly_do_tu_vong, tu_vong_lien_quan_nkbv",
    )
    .eq("ma_benh_an", ma)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { success: false as const, error: error.message };
  if (!data) return { success: false as const, error: "Không tìm thấy hồ sơ bệnh án" };
  return { success: true as const, data };
}

export type NkbvBenhAnHubCase = {
  id: string;
  ma_ca: string | null;
  loai_ma: string | null;
  loai_ten: string | null;
  trang_thai_ma: string | null;
  trang_thai_ten: string | null;
  ngay_phat_hien: string | null;
  vi_tri_nhiem_khuan: string | null;
  tac_nhan_vi_khuan: string | null;
  doe: string | null;
  poa_hai: string | null;
  major_type: string;
  /** Index XN gắn phiếu (hàng đợi chưa PT) */
  index_vi_sinh_id: string | null;
  analysis_disposition: "BO_QUA" | null;
  /** XN attributed trong RIT/SBAP (đã PT cùng phiếu). */
  attributed_vi_sinh_ids: string[];
};

export type NkbvBenhAnHubLis = {
  id: string;
  ma_xet_nghiem: string | null;
  loai_benh_pham: string | null;
  loai_benh_pham_chuan: string | null;
  ngay_lay_mau: string | null;
  tac_nhan: string | null;
  so_luong: string | null;
  ket_qua_phan_loai: string | null;
  ket_qua_duong_tinh: boolean | null;
  is_mdro: boolean;
  mdro_phenotype: string | null;
  analysis_disposition: "BO_QUA" | "DA_PHAN_TICH" | "KHONG_DU_TC" | null;
};

/** Hub 1 màn theo mã BA: ADT + LIS/MDRO + phiếu + cảnh báo RIT/SBAP. */
export async function getNkbvBenhAnHub(maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const ma = String(maBenhAn || "").trim();
  if (!ma) return { success: false as const, error: "Thiếu mã bệnh án" };

  const supabase = await createServerSupabaseUserClient();

  type HubRow = Record<string, unknown>;
  let stay: HubRow | null = null;
  let lisRaw: HubRow[] = [];
  let casesRaw: HubRow[] = [];
  let devicesRaw: HubRow[] = [];
  let manualRaw: HubRow[] = [];
  let locationDaysRaw: HubRow[] = [];
  let deviceDaysRaw: HubRow[] = [];

  // 1 round-trip qua RPC; fallback đường 5-query khi RPC chưa migrate
  const rpc = await supabase.rpc("fn_nkbv_ba_hub", { p_ma_benh_an: ma });
  if (!rpc.error && rpc.data && typeof rpc.data === "object") {
    const hub = rpc.data as {
      stay: HubRow | null;
      lis: HubRow[];
      cases: HubRow[];
      devices: HubRow[];
      manual: HubRow[];
      location_days?: HubRow[];
      device_days?: HubRow[];
    };
    if (!hub.stay) return { success: false as const, error: "Không tìm thấy hồ sơ bệnh án" };
    stay = hub.stay;
    lisRaw = hub.lis || [];
    casesRaw = hub.cases || [];
    devicesRaw = hub.devices || [];
    manualRaw = hub.manual || [];
    locationDaysRaw = hub.location_days || [];
    deviceDaysRaw = hub.device_days || [];
  } else {
    const { data: stayRow, error: stayErr } = await supabase
      .from("nkbv_fact_benh_an")
      .select(
        "id, ma_benh_an, ma_benh_nhan, ho_ten_benh_nhan, ngay_sinh, gioi_tinh, ngay_vao_vien, ngay_ra_vien, khoa_dieu_tri_id, ket_cuc_dieu_tri, ly_do_tu_vong, tu_vong_lien_quan_nkbv",
      )
      .eq("ma_benh_an", ma)
      .eq("is_active", true)
      .maybeSingle();
    if (stayErr) return { success: false as const, error: stayErr.message };
    if (!stayRow) return { success: false as const, error: "Không tìm thấy hồ sơ bệnh án" };
    stay = stayRow as HubRow;

    const [lisRes, casesRes, deviceDaysRes, locationDaysRes, manualRes] = await Promise.all([
      supabase
        .from("nkbv_fact_vi_sinh")
        .select(
          "id, ma_xet_nghiem, loai_benh_pham, loai_benh_pham_chuan, ngay_lay_mau, tac_nhan, so_luong, ket_qua_phan_loai, ket_qua_duong_tinh, is_mdro, mdro_phenotype, metadata",
        )
        .eq("ma_benh_an", ma)
        .eq("is_active", true)
        .order("ngay_lay_mau", { ascending: true })
        .limit(200),
      supabase
        .from("v_nkbv_su_kien_full")
        .select(
          "id, ma_ca, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten, ngay_phat_hien, vi_tri_nhiem_khuan, verification_data, tac_nhan_vi_khuan",
        )
        .eq("ma_benh_an", ma)
        .eq("is_active", true)
        .order("ngay_phat_hien", { ascending: false })
        .limit(100),
      supabase
        .from("nkbv_fact_ba_ngay_dung_cu")
        .select("id, ngay_lich, loai_dung_cu")
        .eq("ma_benh_an", ma)
        .limit(800),
      supabase
        .from("nkbv_fact_ba_ngay_khoa")
        .select("ngay_lich, khoa_id")
        .eq("ma_benh_an", ma)
        .limit(400),
      supabase
        .from("nkbv_fact_ba_timeline")
        .select("id, milestone_kind, milestone_date, title, detail, specimen_hint, criteria_key")
        .eq("ma_benh_an", ma)
        .eq("is_active", true)
        .order("milestone_date", { ascending: true })
        .limit(200),
    ]);

    if (lisRes.error) return { success: false as const, error: lisRes.error.message };
    if (casesRes.error) return { success: false as const, error: casesRes.error.message };
    lisRaw = (lisRes.data || []) as HubRow[];
    casesRaw = (casesRes.data || []) as HubRow[];
    deviceDaysRaw = (deviceDaysRes.error ? [] : deviceDaysRes.data || []) as HubRow[];
    locationDaysRaw = (locationDaysRes.error ? [] : locationDaysRes.data || []) as HubRow[];
    manualRaw = (manualRes.error ? [] : manualRes.data || []) as HubRow[];
    devicesRaw = [];
  }

  const cases: NkbvBenhAnHubCase[] = (casesRaw || []).map((c) => {
    const vd =
      c.verification_data && typeof c.verification_data === "object"
        ? (c.verification_data as Record<string, unknown>)
        : {};
    const metrics =
      vd.cdc_metrics && typeof vd.cdc_metrics === "object"
        ? (vd.cdc_metrics as Record<string, unknown>)
        : vd;
    const doe = metrics.doe || metrics.DOE || c.ngay_phat_hien || null;
    const poaHai = metrics.poa_hai || metrics.POA_HAI || metrics.hai_poa || null;
    const loaiMa = c.loai_ma ? String(c.loai_ma) : null;
    const disp = vd.analysis_disposition === "BO_QUA" ? ("BO_QUA" as const) : null;
    const idxVs = vd.index_vi_sinh_id ? String(vd.index_vi_sinh_id) : null;
    const attributed = Array.isArray(vd.attributed_vi_sinh_ids)
      ? (vd.attributed_vi_sinh_ids as unknown[]).map((x) => String(x)).filter(Boolean)
      : [];
    return {
      id: String(c.id),
      ma_ca: c.ma_ca ? String(c.ma_ca) : null,
      loai_ma: loaiMa,
      loai_ten: c.loai_ten ? String(c.loai_ten) : null,
      trang_thai_ma: c.trang_thai_ma ? String(c.trang_thai_ma) : null,
      trang_thai_ten: c.trang_thai_ten ? String(c.trang_thai_ten) : null,
      ngay_phat_hien: c.ngay_phat_hien ? String(c.ngay_phat_hien).slice(0, 10) : null,
      vi_tri_nhiem_khuan: c.vi_tri_nhiem_khuan ? String(c.vi_tri_nhiem_khuan) : null,
      tac_nhan_vi_khuan: c.tac_nhan_vi_khuan ? String(c.tac_nhan_vi_khuan) : null,
      doe: doe ? String(doe).slice(0, 10) : null,
      poa_hai: poaHai ? String(poaHai) : null,
      major_type: resolveNkbvMajorType({
        loai_ma: loaiMa,
        vi_tri_nhiem_khuan: c.vi_tri_nhiem_khuan ? String(c.vi_tri_nhiem_khuan) : null,
      }),
      index_vi_sinh_id: idxVs,
      analysis_disposition: disp,
      attributed_vi_sinh_ids: attributed,
    };
  });

  const lisAll: NkbvBenhAnHubLis[] = (lisRaw || []).map((r) => {
    const meta =
      r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : {};
    return {
      id: String(r.id),
      ma_xet_nghiem: r.ma_xet_nghiem ? String(r.ma_xet_nghiem) : null,
      loai_benh_pham: r.loai_benh_pham ? String(r.loai_benh_pham) : null,
      loai_benh_pham_chuan: r.loai_benh_pham_chuan ? String(r.loai_benh_pham_chuan) : null,
      ngay_lay_mau: r.ngay_lay_mau ? String(r.ngay_lay_mau).slice(0, 10) : null,
      tac_nhan: r.tac_nhan ? String(r.tac_nhan) : null,
      so_luong: r.so_luong != null ? String(r.so_luong) : null,
      ket_qua_phan_loai: r.ket_qua_phan_loai ? String(r.ket_qua_phan_loai) : null,
      ket_qua_duong_tinh:
        r.ket_qua_duong_tinh === null || r.ket_qua_duong_tinh === undefined
          ? null
          : Boolean(r.ket_qua_duong_tinh),
      is_mdro: Boolean(r.is_mdro),
      mdro_phenotype: r.mdro_phenotype ? String(r.mdro_phenotype) : null,
      analysis_disposition:
        meta.analysis_disposition === "BO_QUA"
          ? ("BO_QUA" as const)
          : meta.analysis_disposition === "DA_PHAN_TICH"
            ? ("DA_PHAN_TICH" as const)
            : meta.analysis_disposition === "KHONG_DU_TC"
              ? ("KHONG_DU_TC" as const)
              : null,
    };
  });
  // Timeline BA nạp mọi XN có ngày lấy mẫu (dương + âm) để IP thấy đủ nuôi cấy
  const lis = lisAll;

  const locationDays = (locationDaysRaw || [])
    .map((r) => ({
      ngay_lich: String(r.ngay_lich || "").slice(0, 10),
      khoa_id: String(r.khoa_id || ""),
    }))
    .filter((r) => r.ngay_lich && r.khoa_id);

  const deviceDays = (deviceDaysRaw || [])
    .map((r) => ({
      id: r.id ? String(r.id) : undefined,
      ngay_lich: String(r.ngay_lich || "").slice(0, 10),
      loai_dung_cu: String(r.loai_dung_cu || "") as "CVC" | "VENT" | "FOLEY",
    }))
    .filter((r) => r.ngay_lich && (r.loai_dung_cu === "CVC" || r.loai_dung_cu === "VENT" || r.loai_dung_cu === "FOLEY"));

  const today = todayYmdInVn();
  const hasActiveVent = deviceDays.some((d) => d.loai_dung_cu === "VENT" && d.ngay_lich >= today);

  const timeline = mergeBaTimelineMilestones({
    lis,
    manual: (manualRaw || []).map((m) => ({
      id: String(m.id),
      milestone_kind: String(m.milestone_kind),
      milestone_date: String(m.milestone_date).slice(0, 10),
      title: String(m.title),
      detail: m.detail ? String(m.detail) : null,
      specimen_hint: m.specimen_hint ? String(m.specimen_hint) : null,
      criteria_key: (m as { criteria_key?: string | null }).criteria_key
        ? String((m as { criteria_key?: string | null }).criteria_key)
        : null,
    })),
    devices: [],
    hasActiveVent,
  });

  const windowAlerts = scanStayCrossCaseAlerts(
    cases.map((c) => ({
      id: c.id,
      ma_benh_an: ma,
      ngay_phat_hien: c.doe || c.ngay_phat_hien,
      vi_tri_nhiem_khuan: c.vi_tri_nhiem_khuan,
      loai_ma: c.loai_ma,
    })),
  );

  const dispositions: Array<{
    index_vi_sinh_id: string | null;
    analysis_disposition: "BO_QUA" | "DA_PHAN_TICH" | "KHONG_DU_TC" | null;
    is_active: boolean | null;
  }> = [
    ...cases.flatMap((c) => {
      const rows: Array<{
        index_vi_sinh_id: string | null;
        analysis_disposition: "BO_QUA" | "DA_PHAN_TICH" | "KHONG_DU_TC" | null;
        is_active: boolean | null;
      }> = [
        {
          index_vi_sinh_id: c.index_vi_sinh_id,
          analysis_disposition: c.analysis_disposition,
          is_active: true,
        },
      ];
      // attributed_vi_sinh_ids từ phiếu đã seed
      const caseRaw = (casesRaw || []).find((x) => String(x.id) === c.id);
      const vd =
        caseRaw?.verification_data && typeof caseRaw.verification_data === "object"
          ? (caseRaw.verification_data as Record<string, unknown>)
          : {};
      const attributed = Array.isArray(vd.attributed_vi_sinh_ids)
        ? (vd.attributed_vi_sinh_ids as string[])
        : [];
      for (const aid of attributed) {
        if (!aid || aid === c.index_vi_sinh_id) continue;
        rows.push({
          index_vi_sinh_id: String(aid),
          analysis_disposition: "DA_PHAN_TICH",
          is_active: true,
        });
      }
      return rows;
    }),
    ...lis
      .filter(
        (l) =>
          l.analysis_disposition === "BO_QUA" ||
          l.analysis_disposition === "DA_PHAN_TICH" ||
          l.analysis_disposition === "KHONG_DU_TC",
      )
      .map((l) => ({
        index_vi_sinh_id: l.id,
        analysis_disposition: l.analysis_disposition,
        is_active: true as boolean | null,
      })),
  ];

  const chuaPhanTichCount = countChuaPhanTich(
    lis.map((l) => l.id),
    dispositions,
  );

  return {
    success: true as const,
    data: {
      stay,
      lis,
      cases,
      devices: [],
      locationDays,
      deviceDays,
      timeline,
      hasActiveVent,
      windowAlerts,
      mdroCount: lis.filter((l) => l.is_mdro).length,
      chuaPhanTichCount,
      analysisDispositions: dispositions,
    },
  };
}

