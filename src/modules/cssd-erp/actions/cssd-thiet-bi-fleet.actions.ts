"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { pmDueStatus, type PmDueStatus } from "@/lib/domain/cssd-equipment-pm";
import { getErrorMessage, mapFkError } from "./cssd-action-common";
import { verifyCssdMaintenanceView } from "@/lib/cssd-server-gates";

function thietBiSpecsField(row: Record<string, unknown>, key: string): string | null {
  const direct = row[key];
  if (direct != null && String(direct).trim()) return String(direct);
  const specs = (row.specs || {}) as Record<string, unknown>;
  const fromSpecs = specs[key];
  return fromSpecs != null && String(fromSpecs).trim() ? String(fromSpecs) : null;
}

export type ThietBiFleetRow = {
  id: string;
  ma_thiet_bi: string;
  ten_thiet_bi: string;
  loai_thiet_bi: string | null;
  ten_loai_may_hien_thi: string | null;
  trang_thai: string | null;
  ngay_bao_tri_tiep_theo: string | null;
  ngay_bao_tri_gan_nhat: string | null;
  chu_ky_bao_tri_ngay: number | null;
  serial_number: string | null;
  model: string | null;
  vi_tri: string | null;
  pm_status: PmDueStatus;
  so_me_tk: number;
};

/** Danh sách máy CSSD cho tab vận hành — read-only, kèm cảnh báo PM. */
export async function listThietBiFleetAction(): Promise<
  { success: true; data: ThietBiFleetRow[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceView();
    const [tbRes, loRes] = await Promise.all([
      supabase
        .from("v_cssd_thiet_bi_full")
        .select(
          "id, ma_thiet_bi, ten_thiet_bi, loai_thiet_bi, ten_loai_may_hien_thi, trang_thai, ngay_bao_tri_tiep_theo, ngay_bao_tri_gan_nhat, chu_ky_bao_tri_ngay, specs",
        )
        .eq("is_active", true)
        .order("ma_thiet_bi"),
      supabase.from("cssd_fact_lo_tiet_khuan").select("thiet_bi_id").eq("is_active", true),
    ]);
    if (tbRes.error) return { success: false, error: mapFkError(tbRes.error.message) };

    const counts = new Map<string, number>();
    for (const row of loRes.data || []) {
      const id = String((row as { thiet_bi_id?: string }).thiet_bi_id || "");
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }

    const data = (tbRes.data || []).map((r: Record<string, unknown>) => {
      const id = String(r.id || "");
      return {
        id,
        ma_thiet_bi: String(r.ma_thiet_bi || ""),
        ten_thiet_bi: String(r.ten_thiet_bi || ""),
        loai_thiet_bi: r.loai_thiet_bi != null ? String(r.loai_thiet_bi) : null,
        ten_loai_may_hien_thi: r.ten_loai_may_hien_thi != null ? String(r.ten_loai_may_hien_thi) : null,
        trang_thai: r.trang_thai != null ? String(r.trang_thai) : null,
        ngay_bao_tri_tiep_theo: r.ngay_bao_tri_tiep_theo != null ? String(r.ngay_bao_tri_tiep_theo).slice(0, 10) : null,
        ngay_bao_tri_gan_nhat: r.ngay_bao_tri_gan_nhat != null ? String(r.ngay_bao_tri_gan_nhat).slice(0, 10) : null,
        chu_ky_bao_tri_ngay: r.chu_ky_bao_tri_ngay != null ? Number(r.chu_ky_bao_tri_ngay) : null,
        serial_number: thietBiSpecsField(r, "serial_number"),
        model: thietBiSpecsField(r, "model"),
        vi_tri: thietBiSpecsField(r, "vi_tri"),
        pm_status: pmDueStatus(r.ngay_bao_tri_tiep_theo != null ? String(r.ngay_bao_tri_tiep_theo) : null),
        so_me_tk: counts.get(id) || 0,
      };
    });
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
