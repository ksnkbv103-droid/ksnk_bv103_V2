import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mergeDuplicateBomLinePlan,
  type BomLineForMerge,
  type MergeDuplicateBomResult,
} from "./cssd-bom-line-merge";

const TABLE = "cssd_dm_bo_dung_cu_chi_tiet";

async function loadActiveChiTietForBo(
  supabase: SupabaseClient,
  boDungCuId: string,
): Promise<BomLineForMerge[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, loai_dung_cu_id, so_luong, created_at, is_active, ten_dung_cu_le, ten_chi_tiet")
    .eq("bo_dung_cu_id", boDungCuId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data || []) as BomLineForMerge[];
}

/**
 * Gộp dòng trùng loại trên một bộ: SUM so_luong lên keep, soft-delete phần còn lại.
 * Null loai_dung_cu_id: bỏ qua (ghi note), không gộp theo tên.
 */
export async function mergeDuplicateBomLinesForBo(
  supabase: SupabaseClient,
  boDungCuId: string,
): Promise<MergeDuplicateBomResult> {
  const boId = String(boDungCuId || "").trim();
  if (!boId) throw new Error("Thiếu bo_dung_cu_id.");

  const lines = await loadActiveChiTietForBo(supabase, boId);
  const skippedNullLoai = lines.filter((l) => !String(l.loai_dung_cu_id || "").trim()).length;
  const plan = mergeDuplicateBomLinePlan(lines);
  if (plan.length === 0) {
    return {
      mergedGroups: 0,
      rowsSoftDeleted: 0,
      skippedNullLoai,
      note:
        skippedNullLoai > 0
          ? `Không có nhóm trùng; bỏ qua ${skippedNullLoai} dòng thiếu loai_dung_cu_id.`
          : undefined,
    };
  }

  const now = new Date().toISOString();
  let rowsSoftDeleted = 0;

  for (const group of plan) {
    const { error: upErr } = await supabase
      .from(TABLE)
      .update({ so_luong: group.totalQty, updated_at: now })
      .eq("id", group.keepId)
      .eq("bo_dung_cu_id", boId);
    if (upErr) throw new Error(upErr.message);

    if (group.dropIds.length > 0) {
      const { error: delErr } = await supabase
        .from(TABLE)
        .update({ is_active: false, updated_at: now })
        .in("id", group.dropIds)
        .eq("bo_dung_cu_id", boId);
      if (delErr) throw new Error(delErr.message);
      rowsSoftDeleted += group.dropIds.length;
    }
  }

  return {
    mergedGroups: plan.length,
    rowsSoftDeleted,
    skippedNullLoai,
    note:
      skippedNullLoai > 0
        ? `Đã bỏ qua ${skippedNullLoai} dòng thiếu loai_dung_cu_id (không gộp theo tên).`
        : undefined,
  };
}

/**
 * Sau DOI_LOAI / THEM_DONG: nếu (bo, loai) còn >1 active → gộp SUM vào keep.
 */
export async function coalesceActiveBomLinesForLoai(
  supabase: SupabaseClient,
  boDungCuId: string,
  loaiDungCuId: string,
): Promise<{ merged: boolean; keepId: string | null; totalQty: number }> {
  const boId = String(boDungCuId || "").trim();
  const loaiId = String(loaiDungCuId || "").trim();
  if (!boId || !loaiId) return { merged: false, keepId: null, totalQty: 0 };

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, loai_dung_cu_id, so_luong, created_at, is_active")
    .eq("bo_dung_cu_id", boId)
    .eq("loai_dung_cu_id", loaiId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  const rows = (data || []) as BomLineForMerge[];
  const plan = mergeDuplicateBomLinePlan(rows);
  if (plan.length === 0) {
    const keepId = rows[0]?.id ?? null;
    const totalQty = rows.reduce((s, r) => s + Math.max(0, Math.floor(Number(r.so_luong) || 0)), 0);
    return { merged: false, keepId, totalQty };
  }

  const group = plan[0]!;
  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from(TABLE)
    .update({ so_luong: group.totalQty, updated_at: now })
    .eq("id", group.keepId);
  if (upErr) throw new Error(upErr.message);
  const { error: delErr } = await supabase
    .from(TABLE)
    .update({ is_active: false, updated_at: now })
    .in("id", group.dropIds);
  if (delErr) throw new Error(delErr.message);
  return { merged: true, keepId: group.keepId, totalQty: group.totalQty };
}

/** Tìm 1 dòng active cùng (bo, loai) — dùng THEM_DONG / form create. */
export async function findActiveBomLineByBoLoai(
  supabase: SupabaseClient,
  boDungCuId: string,
  loaiDungCuId: string,
): Promise<{ id: string; so_luong: number } | null> {
  const boId = String(boDungCuId || "").trim();
  const loaiId = String(loaiDungCuId || "").trim();
  if (!boId || !loaiId) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, so_luong, created_at")
    .eq("bo_dung_cu_id", boId)
    .eq("loai_dung_cu_id", loaiId)
    .eq("is_active", true)
    .order("so_luong", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) return null;
  return { id: String(data.id), so_luong: Math.max(0, Math.floor(Number(data.so_luong) || 0)) };
}
