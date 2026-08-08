"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { verifyPermission } from "@/lib/server-permission";
import {
  previewMauSoFromRegistry,
  type DeviceRegistryRow,
  type DeviceRegistryType,
} from "../lib/nkbv-shared-device-days";
import { parseClipAdherence, type ClipAdherence } from "../lib/nkbv-clip";

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

export async function listNkbvDeviceRegistry(maBenhAn: string) {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("nkbv_fact_device_registry")
    .select(
      "id, ma_benh_an, ma_benh_nhan, device_type, insertion_date, removal_date, first_access_date, line_type, khoa_id, notes, is_active, metadata",
    )
    .eq("ma_benh_an", maBenhAn)
    .eq("is_active", true)
    .order("insertion_date", { ascending: false });
  if (error) return { success: false as const, error: error.message, data: [] as DeviceRegistryRecord[] };
  const rows = (data || []).map((r) => {
    const meta = (r.metadata || {}) as Record<string, unknown>;
    return {
      ...(r as DeviceRegistryRecord),
      clip_adherence: parseClipAdherence(meta.clip_adherence),
    };
  });
  return { success: true as const, data: rows };
}

export async function upsertNkbvDeviceRegistry(payload: {
  id?: string;
  ma_benh_an: string;
  ma_benh_nhan?: string | null;
  device_type: DeviceRegistryType;
  insertion_date: string;
  removal_date?: string | null;
  first_access_date?: string | null;
  line_type?: string | null;
  khoa_id?: string | null;
  notes?: string | null;
  /** CLIP adherence — chỉ áp dụng CENTRAL_LINE. */
  clip_adherence?: ClipAdherence | null;
}) {
  await verifyPermission("GIAM_SAT_NKBV", payload.id ? "edit" : "create");
  const supabase = createAdminSupabaseClient();
  const clip =
    payload.device_type === "CENTRAL_LINE" && payload.clip_adherence
      ? parseClipAdherence({
          ...payload.clip_adherence,
          recorded_at:
            payload.clip_adherence.recorded_at || payload.insertion_date.slice(0, 10),
        })
      : null;
  const row = {
    ma_benh_an: payload.ma_benh_an.trim(),
    ma_benh_nhan: payload.ma_benh_nhan ?? null,
    device_type: payload.device_type,
    insertion_date: payload.insertion_date.slice(0, 10),
    removal_date: payload.removal_date ? payload.removal_date.slice(0, 10) : null,
    first_access_date: payload.first_access_date
      ? payload.first_access_date.slice(0, 10)
      : null,
    line_type: payload.line_type ?? null,
    khoa_id: payload.khoa_id ?? null,
    notes: payload.notes ?? null,
    metadata: clip ? { clip_adherence: clip } : {},
    updated_at: new Date().toISOString(),
    is_active: true,
  };

  try {
    if (payload.id) {
      const { data, error } = await supabase
        .from("nkbv_fact_device_registry")
        .update(row)
        .eq("id", payload.id)
        .select()
        .single();
      if (error) throw error;
      revalidatePath("/giam-sat-nkbv");
      return { success: true as const, data };
    }
    const { data, error } = await supabase
      .from("nkbv_fact_device_registry")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    revalidatePath("/giam-sat-nkbv");
    return { success: true as const, data };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Lỗi lưu sổ đăng ký dụng cụ";
    return { success: false as const, error: msg };
  }
}

export async function softDeleteNkbvDeviceRegistry(id: string) {
  await verifyPermission("GIAM_SAT_NKBV", "edit");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("nkbv_fact_device_registry")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath("/giam-sat-nkbv");
  return { success: true as const };
}

/** Prefill device fields for a syndrome from active registry rows on the stay. */
export async function getDevicePrefillForStay(
  maBenhAn: string,
  deviceType: DeviceRegistryType,
): Promise<{
  success: boolean;
  error?: string;
  device_placed_date?: string;
  device_removed_date?: string | null;
  first_access_date?: string | null;
  placed_days_hint?: number;
}> {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const res = await listNkbvDeviceRegistry(maBenhAn);
  if (!res.success) return { success: false, error: res.error };
  const row = res.data.find((d) => d.device_type === deviceType);
  if (!row) return { success: true };
  const start =
    deviceType === "CENTRAL_LINE" && row.first_access_date
      ? row.first_access_date
      : row.insertion_date;
  return {
    success: true,
    device_placed_date: start,
    device_removed_date: row.removal_date,
    first_access_date: row.first_access_date,
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
  let q = supabase
    .from("nkbv_fact_device_registry")
    .select(
      "device_type, insertion_date, removal_date, first_access_date, khoa_id",
    )
    .eq("is_active", true);
  if (input.ma_benh_an) q = q.eq("ma_benh_an", input.ma_benh_an);
  if (input.khoa_id) q = q.eq("khoa_id", input.khoa_id);
  const { data, error } = await q;
  if (error) return { success: false as const, error: error.message };

  const rows: DeviceRegistryRow[] = (data || []).map((r) => ({
    device_type: r.device_type as DeviceRegistryType,
    insertion_date: String(r.insertion_date).slice(0, 10),
    removal_date: r.removal_date ? String(r.removal_date).slice(0, 10) : null,
    first_access_date: r.first_access_date
      ? String(r.first_access_date).slice(0, 10)
      : null,
    khoa_id: r.khoa_id,
  }));

  const preview = previewMauSoFromRegistry(
    rows,
    input.from.slice(0, 10),
    input.to.slice(0, 10),
    input.khoa_id,
  );
  return { success: true as const, data: preview };
}
