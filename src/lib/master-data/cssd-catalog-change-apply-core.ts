import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type CatalogApplyOp,
  type CatalogChangeDraftInput,
  type CatalogMasterSnapshot,
  planCatalogChangeApply,
} from "@/lib/domain/cssd-catalog-change";

const MASTER_TABLES = new Set([
  "cssd_dm_loai_dung_cu",
  "cssd_dm_bo_dung_cu",
  "cssd_dm_bo_dung_cu_chi_tiet",
]);

export async function loadCatalogChangeSnapshot(
  supabase: SupabaseClient,
  input: CatalogChangeDraftInput,
): Promise<{ ok: true; snap: CatalogMasterSnapshot } | { ok: false; error: string }> {
  const snap: CatalogMasterSnapshot = {};
  const maBo = String(input.maBo || "").trim().toUpperCase();
  const maBoDen = String(input.maBoDen || "").trim().toUpperCase();
  const loaiId = String(input.loaiDungCuId || "").trim();
  const chiTietId = String(input.chiTietId || "").trim();

  if (loaiId) {
    const { data, error } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .select("id, ma_loai, ten_loai, is_active, so_luong_kho_du_phong")
      .eq("id", loaiId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (data) {
      snap.loai = data as CatalogMasterSnapshot["loai"];
      snap.reserve = Number((data as { so_luong_kho_du_phong?: number }).so_luong_kho_du_phong || 0);
    }
  }

  if (maBo) {
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo, is_active")
      .eq("ma_bo", maBo)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    snap.bo = (data as CatalogMasterSnapshot["bo"]) || null;
  }

  if (maBoDen) {
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu")
      .select("id, ma_bo, ten_bo, is_active")
      .eq("ma_bo", maBoDen)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    snap.boDen = (data as CatalogMasterSnapshot["boDen"]) || null;
  }

  if (chiTietId) {
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("id, bo_dung_cu_id, loai_dung_cu_id, ten_dung_cu_le, so_luong, is_active")
      .eq("id", chiTietId)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    snap.chiTiet = (data as CatalogMasterSnapshot["chiTiet"]) || null;
  } else if (snap.bo?.id && loaiId) {
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("id, bo_dung_cu_id, loai_dung_cu_id, ten_dung_cu_le, so_luong, is_active")
      .eq("bo_dung_cu_id", snap.bo.id)
      .eq("loai_dung_cu_id", loaiId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    snap.chiTiet = (data as CatalogMasterSnapshot["chiTiet"]) || null;
  }

  if (snap.boDen?.id && loaiId) {
    const { data, error } = await supabase
      .from("cssd_dm_bo_dung_cu_chi_tiet")
      .select("id, so_luong")
      .eq("bo_dung_cu_id", snap.boDen.id)
      .eq("loai_dung_cu_id", loaiId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    snap.chiTietDen = (data as CatalogMasterSnapshot["chiTietDen"]) || null;
  }

  return { ok: true, snap };
}

export async function executeCatalogApplyOps(
  supabase: SupabaseClient,
  ops: CatalogApplyOp[],
): Promise<{ success: true } | { success: false; error: string }> {
  for (const op of ops) {
    const result = await executeOneOp(supabase, op);
    if (!result.success) return result;
  }
  return { success: true };
}

export async function applyApprovedCatalogChange(
  supabase: SupabaseClient,
  input: CatalogChangeDraftInput,
): Promise<{ success: true; ops: CatalogApplyOp[] } | { success: false; error: string }> {
  const loaded = await loadCatalogChangeSnapshot(supabase, input);
  if (!loaded.ok) return { success: false, error: loaded.error };
  const planned = planCatalogChangeApply(input, loaded.snap);
  if (!planned.ok) return { success: false, error: planned.error };
  const executed = await executeCatalogApplyOps(supabase, planned.ops);
  if (!executed.success) return executed;
  return { success: true, ops: planned.ops };
}

async function executeOneOp(
  supabase: SupabaseClient,
  op: CatalogApplyOp,
): Promise<{ success: true } | { success: false; error: string }> {
  if (op.op === "ledger") {
    const now = new Date().toISOString();
    const { error } = await supabase.from("cssd_fact_kho_giao_dich").insert([
      {
        loai_dung_cu_id: op.loaiDungCuId,
        bo_dung_cu_id: op.boDungCuId,
        loai_giao_dich: "DIEU_CHUYEN",
        so_luong_thay_doi: -op.soLuong,
        ghi_chu: op.ghiChu,
        updated_at: now,
      },
      {
        loai_dung_cu_id: op.loaiDungCuId,
        bo_dung_cu_id: op.boDungCuIdDen,
        loai_giao_dich: "DIEU_CHUYEN",
        so_luong_thay_doi: op.soLuong,
        ghi_chu: op.ghiChu,
        updated_at: now,
      },
    ]);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  if (!MASTER_TABLES.has(op.table)) {
    return { success: false, error: `Bảng master không hợp lệ: ${op.table}` };
  }

  if (op.op === "insert") {
    const { error } = await supabase.from(op.table).insert(op.row);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  if (op.op === "update") {
    const { error } = await supabase.from(op.table).update(op.row).eq("id", op.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  const { error } = await supabase
    .from(op.table)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", op.id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
