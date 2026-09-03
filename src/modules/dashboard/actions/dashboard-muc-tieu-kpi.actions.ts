"use server";

import { createServerSupabaseUserClient } from "@/lib/supabase-server";
import { SUPERVISION_COMPLIANCE_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";

export type MucTieuKpiMap = {
  ty_le_vst: number;
  ty_le_gsc: number;
  /** true khi đọc được bảng cấu hình; false → fallback ngưỡng pilot. */
  from_db: boolean;
};

const FALLBACK: MucTieuKpiMap = {
  ty_le_vst: SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
  ty_le_gsc: SUPERVISION_COMPLIANCE_THRESHOLDS.GREEN_MIN,
  from_db: false,
};

/**
 * Mục tiêu chuẩn viện (toàn viện; khoa_id NULL). Soft-fail → GREEN_MIN.
 * Chỉ VST/GSC — không đọc `ty_le_ccs` (đã ẩn khỏi điều hành).
 */
export async function fetchMucTieuKpiVien(): Promise<MucTieuKpiMap> {
  try {
    const supabase = await createServerSupabaseUserClient();
    const { data, error } = await supabase
      .from("ksnk_dm_muc_tieu_kpi")
      .select("metric_key, target_pct")
      .is("khoa_id", null)
      .eq("is_active", true);

    if (error || !data?.length) return { ...FALLBACK };

    const out: MucTieuKpiMap = { ...FALLBACK, from_db: true };
    for (const row of data) {
      const key = String((row as { metric_key?: string }).metric_key || "");
      const pct = Number((row as { target_pct?: number }).target_pct);
      if (!Number.isFinite(pct)) continue;
      if (key === "ty_le_vst" || key === "ty_le_gsc") {
        out[key] = pct;
      }
    }
    return out;
  } catch {
    return { ...FALLBACK };
  }
}
