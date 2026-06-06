"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { QLCV_ROOT_TASK_LIST_MAX } from "../lib/qlcv-query-limits";
import { QLCV_ROOT_TASK_VIEW_SELECT } from "../lib/qlcv-root-list-select";
import { applyQlcvListScopeToQuery, getQlcvListScope } from "../lib/qlcv-list-scope-server";
import type { CongViecView } from "../types";

const QLCV_QUA_HAN_LIST_SELECT =
  "id, tieu_de, han_hoan_thanh, trang_thai, muc_do_uu_tien, loai_cong_viec, nguoi_phu_trach_ten, is_qua_han, phan_tram_hoan_thanh, cong_viec_cha_id" as const;

function scopedRoot(supabase: ReturnType<typeof createAdminSupabaseClient>, scope: Awaited<ReturnType<typeof getQlcvListScope>>) {
  const q = supabase
    .from("v_qlcv_cong_viec_full")
    .select("id", { count: "exact", head: true })
    .is("cong_viec_cha_id", null)
    .eq("is_active", true);
  return applyQlcvListScopeToQuery(q, scope);
}

/**
 * Thống kê tổng hợp dashboard QLCV — dùng `count` trên server, không tải toàn bộ dòng view.
 */
export async function getDashboardData() {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
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

/**
 * Danh sách công việc quá hạn gần đây (ít cột + limit).
 */
export async function getQuaHanTasks(limit = 5) {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const scope = await getQlcvListScope();

  let q = supabase
    .from("v_qlcv_cong_viec_full")
    .select(QLCV_QUA_HAN_LIST_SELECT)
    .eq("is_qua_han", true)
    .eq("is_active", true)
    .is("cong_viec_cha_id", null)
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

    return {
      ...task,
      so_ngay_qua_han: diffDays,
    };
  });
}

/** Phiếu gốc trong phạm vi scope — dùng biểu đồ tab Thống kê (thay list client 1500). */
export async function getQlcvAnalyticsBoardTasks(): Promise<CongViecView[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const scope = await getQlcvListScope();

  let q = supabase
    .from("v_qlcv_cong_viec_full")
    .select(QLCV_ROOT_TASK_VIEW_SELECT)
    .is("cong_viec_cha_id", null)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(QLCV_ROOT_TASK_LIST_MAX);

  q = applyQlcvListScopeToQuery(q, scope);
  const { data, error } = await q;
  if (error) throw new Error("Không tải dữ liệu thống kê QLCV: " + error.message);
  return (data || []) as CongViecView[];
}

/** Snapshot nhẹ cho Command Center — chỉ số + link. */
export async function getQlcvCommandCenterSnapshot() {
  await verifyPermission("CONG_VIEC", "view");
  const stats = await getDashboardData();
  const overdue = await getQuaHanTasks(3);
  return { stats, overdue };
}
