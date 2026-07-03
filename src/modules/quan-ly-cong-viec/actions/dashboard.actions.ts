"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { QLCV_ROOT_TASK_LIST_MAX } from "../lib/qlcv-query-limits";
import { QLCV_ROOT_TASK_VIEW_SELECT } from "../lib/qlcv-root-list-select";
import { applyQlcvListScopeToQuery, getQlcvListScope } from "../lib/qlcv-list-scope-server";
import type { CongViecView } from "../types";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";

const QLCV_QUA_HAN_LIST_SELECT =
  "id, tieu_de, han_hoan_thanh, trang_thai, muc_do_uu_tien, loai_cong_viec, nguoi_phu_trach_ten, is_qua_han, phan_tram_hoan_thanh" as const;

function scopedRoot(supabase: SupabaseClient, scope: Awaited<ReturnType<typeof getQlcvListScope>>) {
  const q = supabase
    .from("v_qlcv_cong_viec_full")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);
  return applyQlcvListScopeToQuery(q, scope);
}

/** Thống kê dashboard QLCV nội bộ KSNK. */
export async function getDashboardData() {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await getQlcvListScope();

  const [tongRes, dangRes, htRes, qhRes] = await Promise.all([
    scopedRoot(supabase, scope),
    scopedRoot(supabase, scope).eq("trang_thai", "DANG_LAM"),
    scopedRoot(supabase, scope).eq("trang_thai", "HOAN_THANH"),
    scopedRoot(supabase, scope).eq("is_qua_han", true),
  ]);

  if (tongRes.error) throw tongRes.error;
  if (dangRes.error) throw dangRes.error;
  if (htRes.error) throw htRes.error;
  if (qhRes.error) throw qhRes.error;

  return {
    tong_cong_viec: tongRes.count ?? 0,
    dang_lam: dangRes.count ?? 0,
    hoan_thanh: htRes.count ?? 0,
    qua_han: qhRes.count ?? 0,
  };
}

export async function getQuaHanTasks(limit = 5) {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await getQlcvListScope();

  let q = supabase
    .from("v_qlcv_cong_viec_full")
    .select(QLCV_QUA_HAN_LIST_SELECT)
    .eq("is_qua_han", true)
    .eq("is_active", true)
    .order("han_hoan_thanh", { ascending: true })
    .limit(limit);

  q = applyQlcvListScopeToQuery(q, scope);

  const { data, error } = await q;
  if (error) throw error;

  return (data || []).map((task) => {
    const today = new Date();
    const dueDate = new Date(String((task as { han_hoan_thanh?: string }).han_hoan_thanh || ""));
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { ...task, so_ngay_qua_han: diffDays };
  });
}

export async function getQlcvAnalyticsBoardTasks(): Promise<CongViecView[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const scope = await getQlcvListScope();

  let q = supabase
    .from("v_qlcv_cong_viec_full")
    .select(QLCV_ROOT_TASK_VIEW_SELECT)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(QLCV_ROOT_TASK_LIST_MAX);

  q = applyQlcvListScopeToQuery(q, scope);
  const { data, error } = await q;
  if (error) throw new Error("Không tải dữ liệu thống kê QLCV: " + error.message);
  return (data || []) as CongViecView[];
}

export async function getQlcvCommandCenterSnapshot() {
  const stats = await getDashboardData();
  const overdue = await getQuaHanTasks(3);
  return { stats, overdue };
}
