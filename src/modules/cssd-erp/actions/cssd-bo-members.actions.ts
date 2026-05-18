"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdKhoDungCuView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";

export async function fetchBoDungCuChiTietMembers(boDungCuId: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdKhoDungCuView();
    const id = String(boDungCuId || "").trim();
    if (!id) return { success: false as const, error: "Thiếu mã bộ", data: [] as unknown[] };
    const { data, error } = await supabase
      .from("dm_bo_dung_cu_chi_tiet")
      .select("*")
      .eq("bo_dung_cu_id", id)
      .eq("is_active", true);
    if (error) return { success: false as const, error: error.message, data: [] };
    return { success: true as const, data: data || [] };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] };
  }
}
