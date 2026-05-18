"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import type { QlcvFormCatalog, QlcvSelectOption } from "../lib/qlcv-form-options";

const MAX_NHAN_SU_OPTIONS = 2000;
const MAX_DM_OPTIONS = 500;

export async function getNhanSuOptions(): Promise<QlcvSelectOption[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("v_mdm_nhan_su_full")
    .select("id, ho_ten, chuc_vu, to_id")
    .eq("is_active", true)
    .order("ho_ten")
    .limit(MAX_NHAN_SU_OPTIONS);

  if (error) throw error;
  return (data || []).map((item) => ({
    id: String(item.id),
    label: `${item.ho_ten ?? ""} (${String(item.chuc_vu || "Nhân viên")})`.trim(),
    to_id: item.to_id != null ? String(item.to_id) : null,
  }));
}

export async function getKhoaPhongOptions(): Promise<QlcvSelectOption[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("dm_khoa_phong")
    .select("id, ten_khoa")
    .eq("is_active", true)
    .order("ten_khoa")
    .limit(MAX_DM_OPTIONS);

  if (error) throw error;
  return (data || []).map((item) => ({
    id: String(item.id),
    label: String(item.ten_khoa ?? ""),
  }));
}

export async function getToCongTacOptions(): Promise<QlcvSelectOption[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("dm_to_cong_tac")
    .select("id, ten_to, ma_to")
    .eq("is_active", true)
    .order("ten_to")
    .limit(MAX_DM_OPTIONS);

  if (error) throw error;
  return (data || []).map((item) => ({
    id: String(item.id),
    label: String(item.ten_to ?? item.ma_to ?? "").trim() || String(item.id),
  }));
}

export async function getLoaiCongViecOptions(): Promise<QlcvSelectOption[]> {
  await verifyPermission("CONG_VIEC", "view");
  const supabase = createAdminSupabaseClient();
  const query = supabase.from("dm_loai_cong_viec").select("id, ma, ten").order("ma").limit(MAX_DM_OPTIONS);
  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map((item) => ({
    id: String(item.ma ?? item.id),
    label: String(item.ten ?? item.ma ?? ""),
  }));
}

/** Một round-trip: tổ + nhân sự + loại + khoa (form QLCV). */
export async function getQlcvFormCatalog(): Promise<QlcvFormCatalog> {
  const [nhanSu, toCongTac, loaiCongViec, khoaPhong] = await Promise.all([
    getNhanSuOptions(),
    getToCongTacOptions(),
    getLoaiCongViecOptions(),
    getKhoaPhongOptions(),
  ]);
  return { nhanSu, toCongTac, loaiCongViec, khoaPhong };
}
