"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getErrorMessage, mapFkError } from "./cssd-action-common";
import { verifyCssdMaintenanceView } from "@/lib/cssd-server-gates";

export type MeTietKhuanTheoMayRow = {
  id: string;
  ma_lo_tiet_khuan: string;
  thoi_gian_bat_dau: string | null;
  thoi_gian_ket_thuc: string | null;
  ket_qua_test: boolean | null;
  ket_qua_bi: boolean | null;
  ket_qua_ci: boolean | null;
  nhiet_do: number | null;
  ap_suat: number | null;
  ghi_chu: string | null;
};

/** Lịch sử mẻ tiệt khuẩn theo máy — read-only, không bảng fact mới. */
export async function listMeTietKhuanTheoThietBiAction(thietBiId: string): Promise<
  { success: true; data: MeTietKhuanTheoMayRow[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  const id = String(thietBiId || "").trim();
  if (!id) return { success: false, error: "Chọn thiết bị." };
  try {
    await verifyCssdMaintenanceView();
    const { data, error } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select(
        "id, ma_lo_tiet_khuan, thoi_gian_bat_dau, thoi_gian_ket_thuc, ket_qua_test, ket_qua_bi, ket_qua_ci, nhiet_do, ap_suat, ghi_chu",
      )
      .eq("is_active", true)
      .eq("thiet_bi_id", id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { success: false, error: mapFkError(error.message) };

    const rows = (data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      ma_lo_tiet_khuan: String(r.ma_lo_tiet_khuan || ""),
      thoi_gian_bat_dau: r.thoi_gian_bat_dau != null ? String(r.thoi_gian_bat_dau) : null,
      thoi_gian_ket_thuc: r.thoi_gian_ket_thuc != null ? String(r.thoi_gian_ket_thuc) : null,
      ket_qua_test: r.ket_qua_test == null ? null : Boolean(r.ket_qua_test),
      ket_qua_bi: r.ket_qua_bi == null ? null : Boolean(r.ket_qua_bi),
      ket_qua_ci: r.ket_qua_ci == null ? null : Boolean(r.ket_qua_ci),
      nhiet_do: r.nhiet_do == null ? null : Number(r.nhiet_do),
      ap_suat: r.ap_suat == null ? null : Number(r.ap_suat),
      ghi_chu: r.ghi_chu != null ? String(r.ghi_chu) : null,
    }));
    return { success: true, data: rows };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/** Máy có mẻ TK (dropdown tab lịch sử vận hành). */
export async function listThietBiCoMeTietKhuanAction(): Promise<
  { success: true; data: { id: string; ma_thiet_bi: string; ten_thiet_bi: string }[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceView();
    const { data: meRows, error: meErr } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("thiet_bi_id")
      .eq("is_active", true)
      .not("thiet_bi_id", "is", null);
    if (meErr) return { success: false, error: mapFkError(meErr.message) };

    const ids = [...new Set((meRows || []).map((r) => String((r as { thiet_bi_id?: string }).thiet_bi_id || "")).filter(Boolean))];
    if (!ids.length) return { success: true, data: [] };

    const { data: tbs, error: tbErr } = await supabase
      .from("cssd_dm_thiet_bi")
      .select("id, ma_thiet_bi, ten_thiet_bi")
      .in("id", ids)
      .eq("is_active", true)
      .order("ma_thiet_bi");
    if (tbErr) return { success: false, error: mapFkError(tbErr.message) };

    return {
      success: true,
      data: (tbs || []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        ma_thiet_bi: String(r.ma_thiet_bi || ""),
        ten_thiet_bi: String(r.ten_thiet_bi || ""),
      })),
    };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
