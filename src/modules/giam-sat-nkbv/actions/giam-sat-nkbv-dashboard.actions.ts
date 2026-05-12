"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { aggregateNkbvDashboard, type NkbvCasRowMinimal, type NkbvDashboardPayload } from "../lib/nkbv-dashboard-aggregate";

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
  let tuStr =
    filters.tu_ngay?.trim() ||
    format(startOfMonth(subMonths(parseISO(denStr), 11)), "yyyy-MM-dd");

  let tuD = parseISO(tuStr);
  const denD = parseISO(denStr);
  if (tuD > denD) {
    tuStr = format(startOfMonth(subMonths(denD, 11)), "yyyy-MM-dd");
    tuD = parseISO(tuStr);
  }

  let q = supabase
    .from("v_fact_giam_sat_nkbv_ca_full")
    .select("ngay_phat_hien, loai_ma, loai_ten, trang_thai_ma, trang_thai_ten, khoa_ten")
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

  const rows = ((data || []) as Array<Record<string, unknown>>).map((x) => ({
    ngay_phat_hien: x.ngay_phat_hien,
    loai_nkbv: { ma_loai: x.loai_ma, ten_loai: x.loai_ten },
    trang_thai_row: { ma_trang_thai: x.trang_thai_ma, ten_trang_thai: x.trang_thai_ten },
    khoa_ghi_nhan: { ten_khoa: x.khoa_ten },
  })) as NkbvCasRowMinimal[];
  const payload = aggregateNkbvDashboard(rows, tuStr, denStr);
  return { success: true as const, data: payload };
}
