"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import { mapDanhMucOptions } from "@/lib/master-data/gateway";
import { GscSessionHistoryRow } from "../types";
import { enrichGscHistoryRows } from "../lib/gsc-read-utils";
import {
  GSC_SESSIONS_FULL_LIST_SELECT,
} from "../lib/gsc-read-view-select";
import { buildSupabaseSearchFilter } from "@/lib/supabase-search-helper";
import { getActorKsnkScope } from "@/lib/actor-ksnk-scope-server";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
  }
  return error instanceof Error ? error.message : "Lỗi không xác định";
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
  /** Slice 5: lọc theo `gstt_dm_bang_kiem.loai_giam_sat`. */
  loaiGiamSat?: GscLoaiGiamSatRoute;
}) {
  const supabase = await createServerSupabaseUserClient();
  try {
    await verifyPermission("GIAM_SAT_CHUNG", "view");
    const scope = await getActorKsnkScope();

    const page = params.page ?? 1;
    const size = Math.min(Math.max(params.pageSize ?? 20, 10), 50);
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
      "ma_khoa_phong",
      "ten_khoa_phong",
      "ten_nhan_vien",
      "loai_bang_kiem",
      "ten_bang_kiem_hien_thi",
    ]);

    // 1. COUNT — chỉ đếm, không tải dữ liệu
    let countQ = supabase
      .from("v_gstt_giam_sat_chung_sessions_full")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);
    if (scope.isMangLuoiKsnk) {
      if (!scope.actorKhoaId) return { success: true as const, data: [], totalCount: 0, page, pageSize: size };
      countQ = countQ.eq("khoa_id", scope.actorKhoaId);
    }
    if (params.loaiBangKiem) countQ = countQ.eq("loai_bang_kiem", params.loaiBangKiem);
    if (params.loaiGiamSat) {
      if (params.loaiGiamSat === "TUAN_THU") {
        countQ = countQ.or("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
      } else {
        countQ = countQ.eq("loai_giam_sat", params.loaiGiamSat);
      }
    }
    if (searchFilter) countQ = countQ.or(searchFilter);
    const { count, error: cErr } = await countQ;
    if (cErr) throw cErr;

    // 2. DATA — đúng 1 trang
    let dataQ = supabase
      .from("v_gstt_giam_sat_chung_sessions_full")
      .select(GSC_SESSIONS_FULL_LIST_SELECT)
      .eq("is_active", true)
      .order(sortCol, { ascending })
      .range(from, to);
    if (scope.isMangLuoiKsnk) {
      if (!scope.actorKhoaId) return { success: true as const, data: [], totalCount: 0, page, pageSize: size };
      dataQ = dataQ.eq("khoa_id", scope.actorKhoaId);
    }
    if (params.loaiBangKiem) dataQ = dataQ.eq("loai_bang_kiem", params.loaiBangKiem);
    if (params.loaiGiamSat) {
      if (params.loaiGiamSat === "TUAN_THU") {
        dataQ = dataQ.or("loai_giam_sat.is.null,loai_giam_sat.eq.TUAN_THU");
      } else {
        dataQ = dataQ.eq("loai_giam_sat", params.loaiGiamSat);
      }
    }
    if (searchFilter) dataQ = dataQ.or(searchFilter);
    const { data: sessions, error } = await dataQ;
    if (error) throw error;

    // Enrich nhẹ — KHÔNG fetch results (lazy load khi xem chi tiết)
    const enriched = enrichGscHistoryRows((sessions ?? []) as Record<string, unknown>[]).map((x) => ({
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
    const scope = await getActorKsnkScope();
    const actorKhoaId = scope.actorKhoaId ? String(scope.actorKhoaId) : null;
    if (scope.isMangLuoiKsnk && !actorKhoaId) {
      return {
        success: true as const,
        data: { khoas: [], khuVucs: [], ngheNghieps: [], nhanSus: [] },
      };
    }

    // Lấy danh mục qua RPC và Cache
    const [registriesRes, khoaData, nhanSuRes, khuVucFallbackRes] = await Promise.all([
      supabase.rpc("rpc_get_registry_options", {
        p_categories: ["KHU_VUC_GIAM_SAT", "NGHE_NGHIEP"]
      }),
      getCachedDmKhoaPhong(),
      (() => {
        let q = supabase.from("mdm_nhan_su").select("id, ho_ten, khoa_id").eq("is_active", true);
        if (scope.isMangLuoiKsnk && actorKhoaId) q = q.eq("khoa_id", actorKhoaId);
        return q.order("ho_ten");
      })(),
      supabase
        .from("gstt_dm_khu_vuc_giam_sat")
        .select("id, ma_khu_vuc, ten_khu_vuc, nhom_mau, thu_tu")
        .eq("is_active", true)
        .order("thu_tu"),
    ]);

    if (registriesRes.error) throw registriesRes.error;
    if (nhanSuRes.error) throw nhanSuRes.error;
    if (khuVucFallbackRes.error) throw khuVucFallbackRes.error;

    const khoaFiltered = scope.isMangLuoiKsnk
      ? actorKhoaId
        ? khoaData.filter((x) => String(x.id) === actorKhoaId)
        : []
      : khoaData;

    const khoas = khoaFiltered.map(x => ({
      id: x.id,
      ma_danh_muc: x.ma_khoa,
      ten_danh_muc: x.ten_khoa,
      loai_danh_muc: "KHOA_PHONG"
    }));

    const nhanSus = (nhanSuRes.data || []).map((x) => ({ id: x.id, ho_ten: x.ho_ten }));

    const registry = (registriesRes.data || {}) as Record<
      string,
      Array<{ id: string; ten: string; ma?: string }>
    >;
    const rpcKhuVucs = Array.isArray(registry.KHU_VUC_GIAM_SAT) ? registry.KHU_VUC_GIAM_SAT : [];
    const fallbackKhuVucs = (khuVucFallbackRes.data || []).map((x) => ({
      id: String(x.id || ""),
      ten: String(x.ten_khu_vuc || ""),
      ma: String(x.ma_khu_vuc || ""),
      nhom_mau: String(x.nhom_mau || ""),
      thu_tu: typeof x.thu_tu === "number" ? x.thu_tu : null,
    }));
    const effectiveKhuVucs = rpcKhuVucs.length > 0 ? rpcKhuVucs : fallbackKhuVucs;
    const khuVucs = effectiveKhuVucs.map((r) => ({
      id: r.id,
      ma_danh_muc: r.ma || "",
      ten_danh_muc: r.ten,
      loai_danh_muc: "KHU_VUC_GIAM_SAT",
      source: "registry_lookup" as const,
      nhom_mau: (r as { nhom_mau?: string }).nhom_mau ?? null,
      thu_tu: typeof (r as { thu_tu?: number }).thu_tu === "number" ? (r as { thu_tu?: number }).thu_tu : null,
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
