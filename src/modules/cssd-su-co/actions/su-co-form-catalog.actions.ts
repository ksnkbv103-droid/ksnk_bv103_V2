"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdIncidentCreate } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "@/modules/cssd-erp/shared/cssd-db-utils";

export async function fetchSuCoFormCatalog() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdIncidentCreate();
    const [cRes, mRes, hRes] = await Promise.all([
      supabase.from("dm_loai_su_co").select("id, ten_loai_su_co").eq("is_active", true).order("ten_loai_su_co"),
      supabase.from("dm_loai_may_tiet_khuan").select("id, ten_loai_may").eq("is_active", true).order("ten_loai_may"),
      supabase.from("dm_hoa_chat").select("id, ten_hoa_chat, ma_hoa_chat").eq("is_active", true).order("ten_hoa_chat"),
    ]);
    if (cRes.error) return { success: false as const, error: cRes.error.message, categories: [], machines: [], chemicals: [] };
    const categories = (cRes.data || []).map((c: { id: string; ten_loai_su_co?: string }) => ({
      id: c.id,
      ten: c.ten_loai_su_co || "",
    }));
    const machines = (mRes.data || []).map((m: { id: string; ten_loai_may?: string }) => ({
      id: m.id,
      ten: m.ten_loai_may || "",
    }));
    const chemicals = (hRes?.data || []).map((h: { id: string; ten_hoa_chat?: string; ma_hoa_chat?: string }) => ({
      id: h.id,
      ten: h.ten_hoa_chat || "",
      ma: h.ma_hoa_chat || "",
    }));
    return { success: true as const, categories, machines, chemicals };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), categories: [], machines: [], chemicals: [] };
  }
}
