"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyPermission } from "@/lib/server-permission";
import { fetchActiveRegistryDmRows } from "@/lib/master-data/registry-select-fetch";
import { normalizeNullableFk } from "@/lib/master-data/fk-normalize";
import {
  softDeleteManyMasterRows,
  softDeleteMasterRow,
  toggleMasterStatus,
  upsertMasterRow,
} from "./master-crud-core";

type BoDungCuRow = {
  id: string;
  loai_dung_cu_id?: string | null;
  khoa_su_dung_id?: string | null;
  [key: string]: unknown;
};

export async function getLoaiDungCuOptionsAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "LOAI_DUNG_CU");
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

export async function getBoDungCuRowsAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("dm_bo_dung_cu")
    .select("*")
    .order("is_active", { ascending: false })
    .order("ma_bo", { ascending: true });
  if (error) return { success: false, error: error.message };
  const rows = (data || []) as BoDungCuRow[];

  const loaiIds = Array.from(
    new Set(
      rows
        .map((r) => String(r.loai_dung_cu_id || "").trim())
        .filter(Boolean)
    )
  );
  const khoaIds = Array.from(
    new Set(
      rows
        .map((r) => String(r.khoa_su_dung_id || "").trim())
        .filter(Boolean)
    )
  );
  if (loaiIds.length === 0 && khoaIds.length === 0) return { success: true, data: rows };

  const [loaiResult, khoaResult] = await Promise.all([
    loaiIds.length
      ? supabase
          .from("dm_loai_dung_cu")
          .select("id, ten_loai_dung_cu, ten_loai, ma_loai, ma_loai_dung_cu")
          .in("id", loaiIds)
      : Promise.resolve({ data: [], error: null }),
    khoaIds.length
      ? supabase
          .from("dm_khoa_phong")
          .select("id, ten_khoa, ma_khoa")
          .in("id", khoaIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (loaiResult.error) return { success: false, error: loaiResult.error.message };
  if (khoaResult.error) return { success: false, error: khoaResult.error.message };

  const loaiMap = new Map(
    (loaiResult.data || []).map((x) => {
      const ma = x.ma_loai_dung_cu ?? x.ma_loai ?? null;
      const ten = x.ten_loai_dung_cu ?? x.ten_loai ?? "";
      return [x.id, { id: x.id, ten_danh_muc: ten, ma_danh_muc: ma != null ? String(ma) : null }] as const;
    })
  );
  const khoaMap = new Map((khoaResult.data || []).map((x) => [x.id, x] as const));
  const enriched = rows.map((r) => ({
    ...r,
    loai_dung_cu: r.loai_dung_cu_id ? loaiMap.get(r.loai_dung_cu_id) || null : null,
    khoa_su_dung: r.khoa_su_dung_id ? khoaMap.get(r.khoa_su_dung_id) || null : null,
  }));

  return { success: true, data: enriched };
}

export async function getKhoaPhongOptionsForBoAction() {
  await verifyPermission("BO_DC", "view");
  const supabase = createAdminSupabaseClient();
  try {
    const rows = await fetchActiveRegistryDmRows(supabase, "KHOA_PHONG");
    return {
      success: true as const,
      data: rows.map((r) => ({ id: r.id, ten_khoa: r.ma ? `${r.ten} (${r.ma})` : r.ten })),
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false as const, error: msg };
  }
}

export async function saveBoDungCuAction(input: Record<string, unknown>) {
  const id = String(input.id || "").trim();
  await verifyPermission("BO_DC", id ? "edit" : "create");
  const supabase = createAdminSupabaseClient();
  let khoaSuDungNorm: string | null = null;
  try {
    khoaSuDungNorm = await normalizeNullableFk(supabase, "dm_khoa_phong", input.khoa_su_dung_id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
  if (String(input.khoa_su_dung_id || "").trim() && !khoaSuDungNorm) {
    return {
      success: false,
      error:
        "Khoa sử dụng không hợp lệ: id không tồn tại trong dm_khoa_phong (chạy migration M3 nếu chưa có cột khoa_su_dung_id).",
    };
  }
  const payload = {
    ma_bo: String(input.ma_bo || "").trim().toUpperCase(),
    ten_bo: String(input.ten_bo || "").trim(),
    loai_dung_cu_id: String(input.loai_dung_cu_id || "").trim() || null,
    khoa_su_dung_id: khoaSuDungNorm,
    quy_cach: String(input.quy_cach || "").trim() || null,
    ghi_chu: String(input.ghi_chu || "").trim() || null,
    trang_thai: String(input.trang_thai || "ACTIVE").trim(),
    ngay_kiem_ke_gan_nhat: input.ngay_kiem_ke_gan_nhat || null,
    is_active: input.is_active !== false,
    updated_at: new Date().toISOString(),
  };
  if (!payload.ma_bo || !payload.ten_bo) {
    return { success: false, error: "Thiếu mã bộ hoặc tên bộ." };
  }

  const res = await upsertMasterRow("dm_bo_dung_cu", id, payload);
  if (!res.success && String(res.error || "").includes("dm_bo_dung_cu_khoa_su_dung_id_fkey")) {
    return {
      success: false,
      error:
        `${res.error} — FK khoa_su_dung_id cần trỏ dm_khoa_phong; chạy migration 20260430007_dm_khoa_phong_profile_and_bo_dung_cu_usage.sql trên Supabase.`,
    };
  }
  return res;
}

export async function toggleBoDungCuStatusAction(id: string, currentStatus: boolean) {
  await verifyPermission("BO_DC", "edit");
  return toggleMasterStatus("dm_bo_dung_cu", id, currentStatus);
}

export async function softDeleteBoDungCuAction(id: string) {
  await verifyPermission("BO_DC", "delete");
  return softDeleteMasterRow("dm_bo_dung_cu", id);
}

export async function softDeleteManyBoDungCuAction(ids: string[]) {
  await verifyPermission("BO_DC", "delete");
  return softDeleteManyMasterRows("dm_bo_dung_cu", ids);
}
