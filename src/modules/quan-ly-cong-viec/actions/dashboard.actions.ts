"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";

/**
 * Lấy dữ liệu thống kê tổng hợp cho Dashboard
 */
export async function getDashboardData() {
  const supabase = createAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from("v_fact_cong_viec_full")
    .select("trang_thai, is_qua_han")
    .is("cong_viec_cha_id", null);

  if (error) throw error;

  const stats = {
    tong_cong_viec: data.length,
    dang_thuc_hien: data.filter(t => t.trang_thai === "DANG_THUC_HIEN").length,
    hoan_thanh: data.filter(t => t.trang_thai === "HOAN_THANH").length,
    qua_han: data.filter(t => t.is_qua_han).length,
  };

  return stats;
}

/**
 * Lấy danh sách các công việc quá hạn gần đây
 */
export async function getQuaHanTasks(limit = 5) {
  const supabase = createAdminSupabaseClient();
  
  const { data, error } = await supabase
    .from("v_fact_cong_viec_full")
    .select("*")
    .eq("is_qua_han", true)
    .order("han_hoan_thanh", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data || []).map(task => {
    const today = new Date();
    const dueDate = new Date(task.han_hoan_thanh);
    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...task,
      so_ngay_qua_han: diffDays
    };
  });
}
