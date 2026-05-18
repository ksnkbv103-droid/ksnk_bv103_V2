"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdKhoDungCuView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "../shared/cssd-db-utils";

const MAX_HISTORY_ROWS = 50;

export async function fetchCssdKhoGiaoDichHistory() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdKhoDungCuView();
    const { data, error } = await supabase
      .from("fact_kho_giao_dich")
      .select("*, dm_khoa_phong(ten_khoa), fact_kho_chi_tiet(so_luong, ghi_chu)")
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_ROWS);
    if (error) return { success: false as const, error: error.message, data: [] as unknown[] };
    return { success: true as const, data: data || [] };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] };
  }
}
