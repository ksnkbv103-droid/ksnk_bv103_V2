"use server";

import { verifyPermission } from "@/lib/server-permission";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import {
  normalizeCdcLocationCode,
  summarizeCdcLocationCoverage,
} from "@/lib/domain/cdc-location-code";

export async function getCdcLocationCoverageAction() {
  await verifyPermission("GIAM_SAT_NKBV", "view");
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("mdm_dm_khoa_phong")
    .select("is_active, specs")
    .eq("is_active", true);
  if (error) {
    console.error({ module: "GIAM_SAT_NKBV", action: "getCdcLocationCoverage", error: error.message });
    return { success: false as const, error: error.message };
  }
  const rows = (data ?? []).map((r) => ({
    is_active: r.is_active !== false,
    cdc_location_code: normalizeCdcLocationCode(
      r.specs && typeof r.specs === "object"
        ? (r.specs as { cdc_location_code?: unknown }).cdc_location_code
        : null,
    ),
  }));
  return { success: true as const, ...summarizeCdcLocationCoverage(rows) };
}
