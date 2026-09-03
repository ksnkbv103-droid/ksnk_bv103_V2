"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import {
  previewMauSoFromRegistry,
  type DeviceRegistryRow,
  type DeviceRegistryType,
} from "../lib/nkbv-shared-device-days";
import { dungCuLoaiToRegistryType, type NkbvDungCuLoai } from "../lib/nkbv-ba-ngay";
import type { ClipAdherence } from "../lib/nkbv-clip";

const WRITE_BLOCKED = "Chỉ tích Foley / máy / CVC trên lưới bệnh án — không nhập sổ đặt–rút.";

export type DeviceRegistryRecord = {
  id: string;
  ma_benh_an: string;
  ma_benh_nhan: string | null;
  device_type: DeviceRegistryType;
  insertion_date: string;
  removal_date: string | null;
  first_access_date: string | null;
  line_type: string | null;
  khoa_id: string | null;
  notes: string | null;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  clip_adherence?: ClipAdherence | null;
};

/** Sổ đặt–rút chỉ đọc — suy từ ngày đã tích. */
export async function listNkbvDeviceRegistry(maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const ma = String(maBenhAn || "").trim();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("nkbv_v_ba_dung_cu_dat_rut")
    .select("ma_benh_an, loai_dung_cu, ngay_dat, ngay_rut")
    .eq("ma_benh_an", ma);
  if (error) return { success: false as const, error: error.message, data: [] as DeviceRegistryRecord[] };
  const rows: DeviceRegistryRecord[] = (data || []).map((r) => {
    const loai = String(r.loai_dung_cu) as NkbvDungCuLoai;
    const dat = String(r.ngay_dat).slice(0, 10);
    const rut = String(r.ngay_rut).slice(0, 10);
    return {
      id: `${ma}:${loai}:${dat}`,
      ma_benh_an: ma,
      ma_benh_nhan: null,
      device_type: dungCuLoaiToRegistryType(loai),
      insertion_date: dat,
      removal_date: rut,
      first_access_date: null,
      line_type: null,
      khoa_id: null,
      notes: null,
      is_active: true,
      clip_adherence: null,
    };
  });
  return { success: true as const, data: rows };
}

export async function upsertNkbvDeviceRegistry(_payload: {
  id?: string;
  ma_benh_an: string;
  device_type: DeviceRegistryType;
  insertion_date: string;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "create");
  return { success: false as const, error: WRITE_BLOCKED };
}

export async function softDeleteNkbvDeviceRegistry(_id: string) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  return { success: false as const, error: WRITE_BLOCKED };
}

export async function getDevicePrefillForStay(
  maBenhAn: string,
  deviceType: DeviceRegistryType,
): Promise<{
  success: boolean;
  error?: string;
  device_placed_date?: string;
  device_removed_date?: string | null;
  first_access_date?: string | null;
}> {
  const res = await listNkbvDeviceRegistry(maBenhAn);
  if (!res.success) return { success: false, error: res.error };
  const row = res.data.find((d) => d.device_type === deviceType);
  if (!row) return { success: true };
  return {
    success: true,
    device_placed_date: row.insertion_date,
    device_removed_date: row.removal_date,
    first_access_date: null,
  };
}

export async function previewMauSoFromDeviceRegistryAction(input: {
  khoa_id?: string | null;
  from: string;
  to: string;
  ma_benh_an?: string;
}) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const supabase = createAdminSupabaseClient();
  let q = supabase.from("nkbv_v_ba_dung_cu_dat_rut").select("ma_benh_an, loai_dung_cu, ngay_dat, ngay_rut");
  if (input.ma_benh_an) q = q.eq("ma_benh_an", input.ma_benh_an);
  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };

  const rows: DeviceRegistryRow[] = (data || []).map((r) => ({
    device_type: dungCuLoaiToRegistryType(String(r.loai_dung_cu) as NkbvDungCuLoai),
    insertion_date: String(r.ngay_dat).slice(0, 10),
    removal_date: String(r.ngay_rut).slice(0, 10),
    first_access_date: null,
    khoa_id: input.khoa_id ?? null,
  }));
  const preview = previewMauSoFromRegistry(
    rows,
    input.from.slice(0, 10),
    input.to.slice(0, 10),
    input.khoa_id,
  );
  return { success: true as const, data: preview };
}
