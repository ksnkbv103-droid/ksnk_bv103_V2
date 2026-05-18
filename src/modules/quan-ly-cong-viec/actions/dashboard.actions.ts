"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";

const QLCV_QUA_HAN_LIST_SELECT =
  "id, tieu_de, han_hoan_thanh, trang_thai, muc_do_uu_tien, loai_cong_viec, nguoi_phu_trach_ten, is_qua_han, phan_tram_hoan_thanh, cong_viec_cha_id" as const;

/**
 * Thống kê tổng hợp dashboard QLCV — dùng `count` trên server, không tải toàn bộ dòng view.
 */
export async function getDashboardData() {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();

  const root = () =>
    supabase
      .from("v_fact_cong_viec_full")
      .select("id", { count: "exact", head: true })
      .is("cong_viec_cha_id", null)
      .eq("is_active", true);

  const [tongRes, dangRes, htRes, qhRes] = await Promise.all([
    root(),
    supabase
      .from("v_fact_cong_viec_full")
      .select("id", { count: "exact", head: true })
      .is("cong_viec_cha_id", null)
      .eq("is_active", true)
      .eq("trang_thai", "DANG_LAM"),
    supabase
      .from("v_fact_cong_viec_full")
      .select("id", { count: "exact", head: true })
      .is("cong_viec_cha_id", null)
      .eq("is_active", true)
      .eq("trang_thai", "HOAN_THANH"),
    supabase
      .from("v_fact_cong_viec_full")
      .select("id", { count: "exact", head: true })
      .is("cong_viec_cha_id", null)
      .eq("is_active", true)
      .eq("is_qua_han", true),
  ]);

  if (tongRes.error) throw tongRes.error;
  if (dangRes.error) throw dangRes.error;
  if (htRes.error) throw htRes.error;
  if (qhRes.error) throw qhRes.error;

  return {
    tong_cong_viec: tongRes.count ?? 0,
    /** Phiếu gốc `trang_thai = DANG_LAM` (Track B). */
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

  const { data, error } = await supabase
    .from("v_fact_cong_viec_full")
    .select(QLCV_QUA_HAN_LIST_SELECT)
    .eq("is_qua_han", true)
    .eq("is_active", true)
    .is("cong_viec_cha_id", null)
    .order("han_hoan_thanh", { ascending: true })
    .limit(limit);

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
