"use server";

import { verifyPermission } from "@/lib/server-permission";
import { getCachedDmKhoaPhong } from "@/lib/cache/master-data-cache";
import type { QlcvFormCatalog, QlcvSelectOption } from "../lib/qlcv-form-options";
import { ensureQlcvKsnkAccess } from "../lib/qlcv-action-guard";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";

const MAX_NHAN_SU_OPTIONS = 500;
const MAX_DM_OPTIONS = 500;

async function getKsnkNhanSuOptions(ksnkKhoaId: string): Promise<QlcvSelectOption[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase
    .from("v_mdm_nhan_su_full")
    .select("id, ho_ten, chuc_vu, to_id")
    .eq("is_active", true)
    .eq("khoa_id", ksnkKhoaId)
    .order("ho_ten")
    .limit(MAX_NHAN_SU_OPTIONS);

  if (error) throw error;
  return (data || []).map((item) => ({
    id: String(item.id),
    label: `${item.ho_ten ?? ""} (${String(item.chuc_vu || "Nhân viên")})`.trim(),
    to_id: item.to_id != null ? String(item.to_id) : null,
  }));
}

async function getToCongTacOptions(): Promise<QlcvSelectOption[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase
    .from("mdm_dm_to_cong_tac")
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

async function getLoaiCongViecOptions(): Promise<QlcvSelectOption[]> {
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const query = supabase.from("qlcv_dm_loai_cong_viec").select("id, ma, ten").order("ma").limit(MAX_DM_OPTIONS);
  const { data, error } = await query;

  if (error) throw error;
  return (data || []).map((item) => ({
    id: String(item.ma ?? item.id),
    label: String(item.ten ?? item.ma ?? ""),
  }));
}

async function getKhoaPhongOptions(): Promise<QlcvSelectOption[]> {
  const rows = await getCachedDmKhoaPhong();
  return rows.map((item) => ({
    id: String(item.id),
    label: formatKhoaPickerLabel({ ma_khoa: item.ma_khoa, ten_khoa: item.ten_khoa }),
  }));
}

/** Một round-trip: tổ + nhân sự KSNK + khoa địa điểm + loại + màu trạng thái. */
export async function getQlcvFormCatalog(): Promise<QlcvFormCatalog> {
  const { ksnkKhoaId } = await ensureQlcvKsnkAccess("view");
  const [nhanSu, toCongTac, khoaPhong, loaiCongViec, trangThaiMauSac] = await Promise.all([
    getKsnkNhanSuOptions(ksnkKhoaId),
    getToCongTacOptions(),
    getKhoaPhongOptions(),
    getLoaiCongViecOptions(),
    getTrangThaiMauSacMap(),
  ]);
  return { nhanSu, toCongTac, khoaPhong, loaiCongViec, trangThaiMauSac };
}

/** Map mã trạng thái → mau_sac từ MDM (qlcv_dm_trang_thai_cong_viec). */
export async function getTrangThaiMauSacMap(): Promise<Record<string, string>> {
  await verifyPermission("CONG_VIEC", "view");
  const { supabase } = await ensureQlcvKsnkAccess("view");
  const { data, error } = await supabase
    .from("qlcv_dm_trang_thai_cong_viec")
    .select("ma, mau_sac")
    .eq("is_active", true)
    .limit(MAX_DM_OPTIONS);

  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data || []) {
    const ma = String(row.ma ?? "").trim();
    const color = String(row.mau_sac ?? "").trim();
    if (ma && color) map[ma] = color;
  }
  return map;
}
