"use server";

import { createAdminSupabaseClient, createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchAllRangeRows } from "@/lib/fetch-all-range";
import { parseISO } from "date-fns";
import { bv103DefaultTuNgayFromDenIso } from "@/lib/bv103-analytics-default-range";
import { todayYmdInVn } from "@/lib/format-datetime-vi";
import {
  aggregateNkbvDashboard,
  NKBV_CHO_TAC_STATUS_MAS,
  type NkbvCasRowMinimal,
  type NkbvEpidemiologyRate,
} from "../lib/nkbv-dashboard-aggregate";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import { unstable_cache } from "next/cache";

type GiamSatNkbvDashboardFilters = {
  khoa_ghi_nhan_id?: string;
  khoa_ghi_nhan_ids?: string[];
  tu_ngay?: string;
  den_ngay?: string;
};

const NKBV_DASH_CACHE_TAG = "nkbv-dashboard-aggregate";

async function loadNkbvDashboardRaw(tuStr: string, denStr: string, khoaId: string | null, khoaIds: string[]) {
  const supabase = createAdminSupabaseClient();
  const data = await fetchAllRangeRows<Record<string, unknown>>((from, to) => {
    let q = supabase
      .from("v_nkbv_su_kien_full")
      .select("ngay_phat_hien, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten, khoa_ten, khoa_ma")
      .eq("is_active", true)
      .gte("ngay_phat_hien", tuStr)
      .lte("ngay_phat_hien", denStr);
    if (khoaIds.length > 0) {
      q = q.in("khoa_ghi_nhan_id", khoaIds);
    } else if (khoaId) {
      q = q.eq("khoa_ghi_nhan_id", khoaId);
    }
    return q
      .order("ngay_phat_hien", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);
  });

  const { data: rpcData, error: rpcError } = await supabase.rpc("fn_nkbv_dich_te_hoc_rates", {
    p_tu_ngay: tuStr,
    p_den_ngay: denStr,
    p_khoa_id: khoaId,
  });

  return { data, rpcData, rpcErrorMessage: rpcError?.message ?? null };
}

/** Phiếu NKBV + thống kê theo khoảng ngày và khoa (dashboard tab). */
export async function getGiamSatNkbvDashboardPayload(filters: GiamSatNkbvDashboardFilters = {}) {
  await verifyPermission("GIAM_SAT_NKBV", "view");

  const denStr = filters.den_ngay?.trim() || todayYmdInVn();
  let tuStr = filters.tu_ngay?.trim() || bv103DefaultTuNgayFromDenIso(denStr);

  let tuD = parseISO(tuStr);
  const denD = parseISO(denStr);
  if (tuD > denD) {
    tuStr = bv103DefaultTuNgayFromDenIso(denStr);
    tuD = parseISO(tuStr);
  }

  const khoaIds = (filters.khoa_ghi_nhan_ids || []).map((x) => String(x || "").trim()).filter(Boolean);
  const khoaId = filters.khoa_ghi_nhan_id?.trim() || null;
  const cacheKey = JSON.stringify({ tuStr, denStr, khoaId, khoaIds });

  // A) fetchAll mỗi lần mở tab. B) unstable_cache 90s theo bộ lọc — chọn B (số tổng hợp).
  let raw: Awaited<ReturnType<typeof loadNkbvDashboardRaw>>;
  try {
    raw = await unstable_cache(
      () => loadNkbvDashboardRaw(tuStr, denStr, khoaId, khoaIds),
      [NKBV_DASH_CACHE_TAG, cacheKey],
      { revalidate: 90, tags: [NKBV_DASH_CACHE_TAG] },
    )();
  } catch (e: unknown) {
    return { success: false as const, error: e instanceof Error ? e.message : "Không tải được dashboard NKBV" };
  }

  if (raw.rpcErrorMessage) {
    console.error("[giam-sat-nkbv] fn_nkbv_dich_te_hoc_rates thất bại", {
      module: "giam-sat-nkbv",
      action: "getGiamSatNkbvDashboardPayload",
      error: raw.rpcErrorMessage,
    });
  }

  const rows = raw.data.map((x) => ({
    ngay_phat_hien: x.ngay_phat_hien,
    loai_nkbv: { ma_loai: x.loai_ma, ten_loai: x.loai_ten },
    trang_thai_row: { ma_trang_thai: x.trang_thai_ma, ten_trang_thai: x.trang_thai_ten },
    khoa_ghi_nhan: { ma_khoa: x.khoa_ma, ten_khoa: x.khoa_ten },
  })) as NkbvCasRowMinimal[];
  const payload = aggregateNkbvDashboard(rows, tuStr, denStr);

  const epidemiologyRates = ((raw.rpcData || []) as Array<Record<string, unknown>>).map((r) => ({
    ...r,
    ten_khoa: formatKhoaCompactLabel({
      ma_khoa: r.ma_khoa != null ? String(r.ma_khoa) : null,
      ten_khoa: r.ten_khoa != null ? String(r.ten_khoa) : null,
    }),
  })) as NkbvEpidemiologyRate[];

  return {
    success: true as const,
    data: {
      ...payload,
      epidemiologyRates,
      epidemiologyError: raw.rpcErrorMessage,
    },
  };
}

/** Đếm phiếu đang / chờ xác nhận — không tải danh sách hay RPC dịch tễ. */
export async function countGiamSatNkbvChoXn(filters: {
  tu_ngay: string;
  den_ngay: string;
  khoa_ghi_nhan_id?: string;
}): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const supabase = await createServerSupabaseUserClient();
  await verifyPermission("GIAM_SAT_NKBV", "view");

  const denStr = filters.den_ngay.trim();
  let tuStr = filters.tu_ngay.trim();
  if (parseISO(tuStr) > parseISO(denStr)) {
    tuStr = bv103DefaultTuNgayFromDenIso(denStr);
  }

  // Giữ exact — số nghiệp vụ chờ xác nhận.
  let q = supabase
    .from("v_nkbv_su_kien_full")
    .select("ngay_phat_hien", { count: "exact", head: true })
    .eq("is_active", true)
    .in("trang_thai_ma", [...NKBV_CHO_TAC_STATUS_MAS])
    .gte("ngay_phat_hien", tuStr)
    .lte("ngay_phat_hien", denStr);
  if (filters.khoa_ghi_nhan_id?.trim()) {
    q = q.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id.trim());
  }

  const { count, error } = await q;
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, count: count ?? 0 };
}
