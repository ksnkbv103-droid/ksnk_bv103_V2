import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildKiemKeBoDeltas,
  buildKiemKeKhoDeltas,
  KIEM_KE_LOAI_GIAO_DICH,
  resolveTrangThaiAfterKiemKe,
  type KiemKeBoLineInput,
  type KiemKeKhoLineInput,
} from "@/lib/domain/cssd-kiem-ke";

type Ok = { success: true; applied: number };
type Fail = { success: false; error: string };

/** Kiểm kê bộ: ghi KIEM_KE trên ledger theo từng dòng lệch; cập nhật ngày kiểm kê (+ ACTIVE nếu INVENTORY). */
export async function applyKiemKeBo(
  supabase: SupabaseClient,
  params: {
    boDungCuId: string;
    lines: KiemKeBoLineInput[];
    note?: string;
    nguoiThucHienId?: string | null;
  },
): Promise<Ok | Fail> {
  const boId = String(params.boDungCuId || "").trim();
  if (!boId) return { success: false, error: "Thiếu bộ dụng cụ." };

  const built = buildKiemKeBoDeltas(params.lines);
  if (!built.ok) return { success: false, error: built.error };

  const now = new Date().toISOString();
  const noteBase = String(params.note || "").trim() || "Kiểm kê bộ";

  for (const d of built.deltas) {
    const { error } = await supabase.from("cssd_fact_kho_giao_dich").insert({
      loai_dung_cu_id: d.loaiDungCuId,
      bo_dung_cu_id: boId,
      quy_trinh_id: null,
      loai_giao_dich: KIEM_KE_LOAI_GIAO_DICH,
      so_luong_thay_doi: d.soLuongThayDoi,
      ghi_chu: `${noteBase}: đếm ${d.dem} (hệ thống ${d.baseline})`,
      su_co_id: null,
      nguoi_thuc_hien_id: params.nguoiThucHienId || null,
      updated_at: now,
    });
    if (error) return { success: false, error: error.message };
  }

  const { data: boRow } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .select("trang_thai")
    .eq("id", boId)
    .maybeSingle();
  const nextTrangThai = resolveTrangThaiAfterKiemKe(
    (boRow as { trang_thai?: string | null } | null)?.trang_thai,
  );

  const { error: boErr } = await supabase
    .from("cssd_dm_bo_dung_cu")
    .update({
      ngay_kiem_ke_gan_nhat: now,
      trang_thai: nextTrangThai,
      updated_at: now,
    })
    .eq("id", boId);
  if (boErr) return { success: false, error: boErr.message };

  return { success: true, applied: built.deltas.length };
}

/** Kiểm kê kho: set so_luong_kho_du_phong = dem + audit KIEM_KE (bo null). */
export async function applyKiemKeKho(
  supabase: SupabaseClient,
  params: {
    lines: KiemKeKhoLineInput[];
    note?: string;
    nguoiThucHienId?: string | null;
  },
): Promise<Ok | Fail> {
  const built = buildKiemKeKhoDeltas(params.lines);
  if (!built.ok) return { success: false, error: built.error };

  const now = new Date().toISOString();
  const noteBase = String(params.note || "").trim() || "Kiểm kê kho dự phòng";

  for (const d of built.deltas) {
    const { error: updErr } = await supabase
      .from("cssd_dm_loai_dung_cu")
      .update({
        so_luong_kho_du_phong: d.dem,
        updated_at: now,
      })
      .eq("id", d.loaiDungCuId);
    if (updErr) return { success: false, error: updErr.message };

    const { error: insErr } = await supabase.from("cssd_fact_kho_giao_dich").insert({
      loai_dung_cu_id: d.loaiDungCuId,
      bo_dung_cu_id: null,
      quy_trinh_id: null,
      loai_giao_dich: KIEM_KE_LOAI_GIAO_DICH,
      so_luong_thay_doi: d.soLuongThayDoi,
      ghi_chu: `${noteBase}: đếm kho ${d.dem} (trước ${d.baseline})`,
      su_co_id: null,
      nguoi_thuc_hien_id: params.nguoiThucHienId || null,
      updated_at: now,
    });
    if (insErr) return { success: false, error: insErr.message };
  }

  return { success: true, applied: built.deltas.length };
}
