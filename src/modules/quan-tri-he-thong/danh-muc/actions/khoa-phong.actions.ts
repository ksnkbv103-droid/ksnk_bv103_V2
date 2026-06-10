"use server";

import { revalidateMasterDataRowCacheTag } from "@/lib/cache/revalidate-master-data-tags";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import { normalizeDanhMucNullableByLoai } from "@/lib/master-data/fk-normalize";
import {
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";
import type { KhoaPhongRow } from "./khoa-phong.types";

function normalizeNonNegativeNumber(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.floor(numeric);
}

export async function getKhoaPhongRowsAction() {
  await verifyPermission("KHOA_PHONG", "view");
  const supabase = createAdminSupabaseClient();
  const { data: dmData, error: dmErr } = await supabase
    .from("mdm_dm_khoa_phong")
    .select(
      "id, ma_khoa, ten_khoa, khoi_id, is_active, specs, khoi:mdm_dm_khoi_khoa!khoi_id(ten_khoi, ma_khoi)",
    )
    .order("is_active", { ascending: false })
    .order("ma_khoa", { ascending: true });
  if (dmErr) return { success: false as const, error: dmErr.message };
  /** Supabase FK embed đôi khi trả object hoặc mảng một phần tử tùy phiên bản truy vấn. */
  type Embed = {
    id: string;
    ma_khoa?: string | null;
    ten_khoa?: string | null;
    khoi_id?: string | null;
    khoi?: { ten_khoi?: string | null; ma_khoi?: string | null } | { ten_khoi?: string | null; ma_khoi?: string | null }[] | null;
    is_active?: boolean | null;
    specs?: any;
  };
  return {
    success: true as const,
    data: (dmData || []).map((raw) => {
      const x = raw as Embed;
      const kEmbed = x.khoi;
      const kObj = Array.isArray(kEmbed) ? kEmbed[0] : kEmbed;
      return {
      id: x.id,
      ma_danh_muc: x.ma_khoa,
      ten_danh_muc: x.ten_khoa,
      khoi_id: x.khoi_id || null,
      ten_khoi: kObj?.ten_khoi || null,
      mo_ta_chuc_nang: x.specs?.mo_ta_chuc_nang || null,
      so_bac_si: normalizeNonNegativeNumber(x.specs?.so_bac_si),
      so_dieu_duong: normalizeNonNegativeNumber(x.specs?.so_dieu_duong),
      so_giuong_benh_thuong: normalizeNonNegativeNumber(x.specs?.so_giuong_benh_thuong),
      so_giuong_cap_cuu: normalizeNonNegativeNumber(x.specs?.so_giuong_cap_cuu),
      is_active: x.is_active !== false,
      specs: x.specs || null,
    };
    }) as KhoaPhongRow[],
  };
}

export async function getKhoiKhoaOptionsAction() {
  await verifyPermission("KHOA_PHONG", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "KHOI_KHOA");
    return {
      success: true as const,
      data: rows.map((r) => ({
        id: r.id,
        ten_danh_muc: r.ma ? `${r.ten} (${r.ma})` : r.ten,
      })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function getKhuVucGiamSatOptionsAction() {
  await verifyPermission("KHOA_PHONG", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "KHU_VUC_GIAM_SAT");
    return {
      success: true as const,
      data: rows,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function saveKhoaPhongAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("KHOA_PHONG", id ? "edit" : "create");
  const supabase = createAdminSupabaseClient();
  let khoiNorm: string | null = null;
  try {
    khoiNorm = await normalizeDanhMucNullableByLoai(supabase, input.khoi_id, "KHOI_KHOA");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
  if (String(input.khoi_id || "").trim() && !khoiNorm) {
    return {
      success: false as const,
      error: "Khối khoa không hợp lệ: chọn trong danh mục KHOI_KHOA hoặc để trống.",
    };
  }
  const existingSpecs = (input.specs as Record<string, any>) || {};
  const payload = {
    ma_khoa: String(input.ma_danh_muc || "").trim().toUpperCase(),
    ten_khoa: String(input.ten_danh_muc || "").trim(),
    khoi_id: khoiNorm,
    is_active: input.is_active !== false,
    specs: {
      ...existingSpecs,
      mo_ta_chuc_nang: String(input.mo_ta_chuc_nang || "").trim() || null,
      so_bac_si: normalizeNonNegativeNumber(input.so_bac_si),
      so_dieu_duong: normalizeNonNegativeNumber(input.so_dieu_duong),
      so_giuong_benh_thuong: normalizeNonNegativeNumber(input.so_giuong_benh_thuong),
      so_giuong_cap_cuu: normalizeNonNegativeNumber(input.so_giuong_cap_cuu),
    },
    updated_at: new Date().toISOString(),
  };
  if (!payload.ma_khoa || !payload.ten_khoa) {
    return { success: false as const, error: "Thiếu mã hoặc tên khoa phòng." };
  }
  return upsertMasterRow("mdm_dm_khoa_phong", id, payload);
}

export async function toggleKhoaPhongStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("KHOA_PHONG", "edit");
  return toggleMasterStatus("mdm_dm_khoa_phong", id, currentStatus);
}

export async function softDeleteKhoaPhongAction(id: string) {
  await verifyPermission("KHOA_PHONG", "delete");
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("mdm_dm_khoa_phong").delete().eq("id", id);
  if (!error) {
    revalidateMasterDataRowCacheTag("mdm_dm_khoa_phong");
    return { success: true as const };
  }
  if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "23503") {
    return { success: false as const, error: "Không thể xóa cứng vì khoa phòng đang được tham chiếu ở dữ liệu nghiệp vụ." };
  }
  return { success: false as const, error: error.message };
}

export async function softDeleteManyKhoaPhongAction(ids: string[]) {
  await verifyPermission("KHOA_PHONG", "delete");
  for (const id of ids) {
    const result = await softDeleteKhoaPhongAction(id);
    if (!result.success) return result;
  }
  return { success: true as const };
}
