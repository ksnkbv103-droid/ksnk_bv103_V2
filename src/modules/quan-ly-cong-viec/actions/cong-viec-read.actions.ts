"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";

/**
 * Lấy danh sách nhân sự để chọn người phụ trách
 */
export async function getNhanSuOptions() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("mdm_nhan_su")
    .select("id, ho_ten, chuc_vu, to_id")
    .eq("is_active", true)
    .order("ho_ten");

  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    label: `${item.ho_ten} (${item.chuc_vu || "Nhân viên"})`,
    to_id: item.to_id,
  }));
}

/**
 * Lấy danh sách khoa phòng
 */
export async function getKhoaPhongOptions() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("dm_khoa_phong")
    .select("id, ten_khoa")
    .eq("is_active", true)
    .order("ten_khoa");

  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    label: item.ten_khoa,
  }));
}

/**
 * Lấy danh sách tổ công tác
 */
export async function getToCongTacOptions() {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("dm_to_cong_tac")
    .select("id, ten_to")
    .eq("is_active", true)
    .order("ten_to");

  if (error) throw error;
  return data.map(item => ({
    id: item.id,
    label: item.ten_to,
  }));
}
