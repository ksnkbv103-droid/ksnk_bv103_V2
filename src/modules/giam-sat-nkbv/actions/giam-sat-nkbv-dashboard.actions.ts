"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { format, parseISO } from "date-fns";
import { bv103DefaultTuNgayFromDenIso } from "@/lib/bv103-analytics-default-range";
import {
  aggregateNkbvDashboard,
  NKBV_CHO_TAC_STATUS_MAS,
  type NkbvCasRowMinimal,
  type NkbvEpidemiologyRate,
} from "../lib/nkbv-dashboard-aggregate";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";

type GiamSatNkbvDashboardFilters = {
  khoa_ghi_nhan_id?: string;
  khoa_ghi_nhan_ids?: string[];
  tu_ngay?: string;
  den_ngay?: string;
};

/** Phiếu NKBV + thống kê theo khoảng ngày và khoa (dashboard tab). */
export async function getGiamSatNkbvDashboardPayload(filters: GiamSatNkbvDashboardFilters = {}) {
  const supabase = await createServerSupabaseUserClient();
  await verifyPermission("GIAM_SAT_NKBV", "view");

  const denStr = filters.den_ngay?.trim() || format(new Date(), "yyyy-MM-dd");
  let tuStr = filters.tu_ngay?.trim() || bv103DefaultTuNgayFromDenIso(denStr);

  let tuD = parseISO(tuStr);
  const denD = parseISO(denStr);
  if (tuD > denD) {
    tuStr = bv103DefaultTuNgayFromDenIso(denStr);
    tuD = parseISO(tuStr);
  }

  let q = supabase
    .from("v_nkbv_su_kien_full")
    .select("ngay_phat_hien, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten, khoa_ten, khoa_ma")
    .eq("is_active", true)
    .gte("ngay_phat_hien", tuStr)
    .lte("ngay_phat_hien", denStr);
  const khoaIds = (filters.khoa_ghi_nhan_ids || []).map((x) => String(x || "").trim()).filter(Boolean);
  if (khoaIds.length > 0) {
    q = q.in("khoa_ghi_nhan_id", khoaIds);
  } else if (filters.khoa_ghi_nhan_id?.trim()) {
    q = q.eq("khoa_ghi_nhan_id", filters.khoa_ghi_nhan_id.trim());
  }

  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };

  // Call the dynamic JCI/CDC epidemiology RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc("fn_nkbv_dich_te_hoc_rates", {
    p_tu_ngay: tuStr,
    p_den_ngay: denStr,
    p_khoa_id: filters.khoa_ghi_nhan_id?.trim() || null
  });

  if (rpcError) {
    console.error("[giam-sat-nkbv] fn_nkbv_dich_te_hoc_rates thất bại", {
      module: "giam-sat-nkbv",
      action: "getGiamSatNkbvDashboardPayload",
      error: rpcError.message,
    });
  }

  const rows = ((data || []) as Array<Record<string, unknown>>).map((x) => ({
    ngay_phat_hien: x.ngay_phat_hien,
    loai_nkbv: { ma_loai: x.loai_ma, ten_loai: x.loai_ten },
    trang_thai_row: { ma_trang_thai: x.trang_thai_ma, ten_trang_thai: x.trang_thai_ten },
    khoa_ghi_nhan: { ma_khoa: x.khoa_ma, ten_khoa: x.khoa_ten },
  })) as NkbvCasRowMinimal[];
  const payload = aggregateNkbvDashboard(rows, tuStr, denStr);
  
  const epidemiologyRates = ((rpcData || []) as Array<Record<string, unknown>>).map((r) => ({
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
      epidemiologyError: rpcError ? rpcError.message : null,
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
