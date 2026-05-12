"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { mapDanhMucOptions } from "@/lib/master-data/gateway";
import { GscSessionHistoryRow, ChecklistResultValue } from "../types";
import { enrichGscHistoryRows } from "../lib/gsc-read-utils";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";

type GscResultRow = { 
  id: string;
  session_id: string; 
  criterion_id: string;
  value: ChecklistResultValue;
  note: string | null;
  created_at: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Lỗi không xác định";
}

export async function getGiamSatChungSessions(loaiBangKiem?: string) {
  return getGiamSatChungHistory(loaiBangKiem);
}

const GSC_FULL_HISTORY_ROW_CAP = 400;

/**
 * Lấy lịch sử Giám sát chung (GSC)
 * Sử dụng View tổng hợp để tối ưu hóa hiệu năng
 *
 * @deprecated Ưu tiên `getGiamSatChungHistoryPaginated`. Hàm này giới hạn tối đa `GSC_FULL_HISTORY_ROW_CAP` phiên
 * và tải kèm toàn bộ `fact_giam_sat_chung_results` của các phiên đó — không dùng cho tập dữ liệu lớn.
 */
export async function getGiamSatChungHistory(loaiBangKiem?: string) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();
    
    let query = supabase
      .from("v_fact_giam_sat_chung_sessions_full")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(GSC_FULL_HISTORY_ROW_CAP);

    if (loaiBangKiem) query = query.eq("loai_bang_kiem", loaiBangKiem);
    if (scope.isMangLuoiKsnk) {
      if (!scope.actorKhoaId) return { success: true as const, data: [] as GscSessionHistoryRow[] };
      query = query.eq("khoa_id", scope.actorKhoaId);
    }

    const { data: sessions, error } = await query;
    if (error) throw error;

    const typedSessions = (sessions || []) as GscSessionHistoryRow[];
    const sessionIds = typedSessions.map((x) => x.id);

    // Lấy kết quả chi tiết cho các phiên
    const resultMap = new Map<string, GscResultRow[]>();
    if (sessionIds.length) {
      const { data: resultsRows, error: rsErr } = await supabase
        .from("fact_giam_sat_chung_results")
        .select("*")
        .in("session_id", sessionIds);
      if (rsErr) throw rsErr;
      (resultsRows || []).forEach((r: GscResultRow) => {
        const sid = String(r.session_id || "");
        if (!resultMap.has(sid)) resultMap.set(sid, []);
        resultMap.get(sid)!.push(r);
      });
    }

    const enriched = enrichGscHistoryRows(
      typedSessions as unknown as Record<string, unknown>[],
    ).map((x) => ({
      ...x,
      is_seen: Boolean(x.is_seen),
      results: resultMap.get(String(x.id)) || [],
    }));

    return { success: true, data: enriched };
  } catch (error: unknown) { 
    return { success: false, error: getErrorMessage(error) }; 
  }
}

/**
 * Phiên bản phân trang Server-side cho Lịch sử GSC.
 * Client chỉ nhận đúng 1 trang (~20 bản ghi), DB thực hiện filter/sort/count.
 */
export async function getGiamSatChungHistoryPaginated(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  loaiBangKiem?: string;
}) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();

    const page = params.page ?? 1;
    const size = Math.min(Math.max(params.pageSize ?? 20, 10), 100);
    const from = (page - 1) * size;
    const to = from + size - 1;
    const rawSort = String(params.sortKey || "").trim();
    const sortAlias: Record<string, string> = { khoa_id: "ten_khoa_phong" };
    const resolvedSort = sortAlias[rawSort] || rawSort;
    const allowedSortCols = new Set([
      "created_at",
      "ngay_giam_sat",
      "thoi_gian_ghi_nhan",
      "tong_diem",
      "loai_bang_kiem",
      "ten_khoa_phong",
    ]);
    const sortCol = allowedSortCols.has(resolvedSort) ? resolvedSort : "created_at";
    const ascending = params.sortDir === "asc";

    // --- Build search filter using centralized helper ---
    const searchFilter = buildSupabaseSearchFilter(params.search, [
      "ten_nguoi_giam_sat",
      "ten_khoa_phong",
      "ten_nhan_vien",
      "loai_bang_kiem",
      "ten_bang_kiem_hien_thi",
    ]);

    // 1. COUNT — chỉ đếm, không tải dữ liệu
    let countQ = supabase
      .from("v_fact_giam_sat_chung_sessions_full")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (scope.isMangLuoiKsnk) {
      if (!scope.actorKhoaId) return { success: true as const, data: [], totalCount: 0, page, pageSize: size };
      countQ = countQ.eq("khoa_id", scope.actorKhoaId);
    }
    if (params.loaiBangKiem) countQ = countQ.eq("loai_bang_kiem", params.loaiBangKiem);
    if (searchFilter) countQ = countQ.or(searchFilter);
    const { count, error: cErr } = await countQ;
    if (cErr) throw cErr;

    // 2. DATA — đúng 1 trang
    let dataQ = supabase
      .from("v_fact_giam_sat_chung_sessions_full")
      .select("*")
      .eq("is_active", true)
      .order(sortCol, { ascending })
      .range(from, to);
    if (scope.isMangLuoiKsnk) {
      if (!scope.actorKhoaId) return { success: true as const, data: [], totalCount: 0, page, pageSize: size };
      dataQ = dataQ.eq("khoa_id", scope.actorKhoaId);
    }
    if (params.loaiBangKiem) dataQ = dataQ.eq("loai_bang_kiem", params.loaiBangKiem);
    if (searchFilter) dataQ = dataQ.or(searchFilter);
    const { data: sessions, error } = await dataQ;
    if (error) throw error;

    // Enrich nhẹ — KHÔNG fetch results (lazy load khi xem chi tiết)
    const enriched = enrichGscHistoryRows(sessions as unknown as Record<string, unknown>[]).map((x) => ({
      ...x,
      is_seen: Boolean(x.is_seen),
    }));

    return { success: true, data: enriched, totalCount: count ?? 0, page, pageSize: size };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

/** 
 * Lấy danh mục cho GSC (Khoa, Khu vực, Nghề nghiệp, Nhân sự) 
 * Tối ưu bằng RPC và Cache layer
 */
export async function getGscHeaderDmDropdowns() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");

    // Lấy danh mục qua RPC và Cache
    const [registriesRes, khoaData, nhanSuRes, khuVucFallbackRes] = await Promise.all([
      supabase.rpc("rpc_get_registry_options", {
        p_categories: ["KHU_VUC_GIAM_SAT", "NGHE_NGHIEP"]
      }),
      getCachedDmKhoaPhong(),
      supabase.from("mdm_nhan_su").select("id, ho_ten").eq("is_active", true).order("ho_ten"),
      supabase
        .from("dm_khu_vuc_giam_sat")
        .select("id, ma_khu_vuc, ten_khu_vuc")
        .eq("is_active", true)
        .order("ten_khu_vuc"),
    ]);

    if (registriesRes.error) throw registriesRes.error;
    if (nhanSuRes.error) throw nhanSuRes.error;
    if (khuVucFallbackRes.error) throw khuVucFallbackRes.error;

    const khoas = khoaData.map(x => ({
      id: x.id,
      ma_danh_muc: x.ma_khoa,
      ten_danh_muc: x.ten_khoa,
      loai_danh_muc: "KHOA_PHONG"
    }));

    const nhanSus = nhanSuRes.data || [];

    const registry = (registriesRes.data || {}) as Record<
      string,
      Array<{ id: string; ten: string; ma?: string }>
    >;
    const rpcKhuVucs = Array.isArray(registry.KHU_VUC_GIAM_SAT) ? registry.KHU_VUC_GIAM_SAT : [];
    const fallbackKhuVucs = (khuVucFallbackRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ten: String(x.ten_khu_vuc || ""),
      ma: String(x.ma_khu_vuc || ""),
    }));
    const effectiveKhuVucs = rpcKhuVucs.length > 0 ? rpcKhuVucs : fallbackKhuVucs;
    const khuVucs = effectiveKhuVucs.map((r) => ({
      id: r.id,
      ten_danh_muc: r.ten,
    }));
    const ngheNghieps = mapDanhMucOptions(
      (registry.NGHE_NGHIEP || []).map((r) => ({
        id: r.id,
        ma_danh_muc: r.ma || "",
        ten_danh_muc: r.ten,
      })),
      "NGHE_NGHIEP",
    );

    return { success: true as const, data: { khoas, khuVucs, ngheNghieps, nhanSus } };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}
