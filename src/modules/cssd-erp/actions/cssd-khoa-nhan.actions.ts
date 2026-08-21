"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdWorkflowView } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "./cssd-action-common";

export type CssdKhoaNhanOption = { id: string; ten: string; ma: string };

export async function listKhoaPhongForCssdCapPhatAction(): Promise<
  { success: true; data: CssdKhoaNhanOption[] } | { success: false; error: string }
> {
  try {
    await verifyCssdWorkflowView();
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from("mdm_dm_khoa_phong")
      .select("id, ten_khoa, ma_khoa")
      .eq("is_active", true)
      .order("ten_khoa", { ascending: true })
      .limit(200);
    if (error) return { success: false, error: error.message };
    const dataRows = (data || []).map((r: { id: string; ten_khoa?: string | null; ma_khoa?: string | null }) => ({
      id: String(r.id),
      ten: String(r.ten_khoa || r.ma_khoa || "Khoa"),
      ma: String(r.ma_khoa || ""),
    }));
    return { success: true, data: dataRows };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
