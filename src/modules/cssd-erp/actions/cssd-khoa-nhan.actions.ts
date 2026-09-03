"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { formatKhoaPickerLabel } from "@/lib/domain/khoa-display";
import { getErrorMessage } from "../shared/cssd-db-utils";

export async function fetchKhoaNhanOptionsForCapPhat() {
  try {
    await verifyCssdWorkflowView();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ma_khoa, ten_khoa")
      .order("ma_khoa")
      .limit(400);
    if (error) return { success: false as const, error: error.message, data: [] as { id: string; label: string }[] };
    return {
      success: true as const,
      data: (data || []).map((r: { id: string; ma_khoa?: string; ten_khoa?: string }) => ({
        id: String(r.id),
        label: formatKhoaPickerLabel({ ma: r.ma_khoa, ten_khoa: r.ten_khoa }),
      })),
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] as { id: string; label: string }[] };
  }
}
