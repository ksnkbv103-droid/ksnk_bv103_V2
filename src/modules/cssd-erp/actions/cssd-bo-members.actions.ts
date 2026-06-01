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
      .from("v_cssd_bo_dung_cu_chi_tiet_full")
      .select("*")
      .eq("bo_dung_cu_id", id)
      .eq("is_active", true);
    if (error) return { success: false as const, error: error.message, data: [] };

    const mapped = (data || []).map((x) => {
      const specs = x.specs || {};
      const max_suds_count = specs.max_suds_count !== undefined && specs.max_suds_count !== null ? Number(specs.max_suds_count) : null;
      const trong_luong = specs.trong_luong !== undefined && specs.trong_luong !== null ? Number(specs.trong_luong) : null;
      return {
        ...x,
        max_suds_count,
        trong_luong,
      };
    });

    return { success: true as const, data: mapped };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] };
  }
}
