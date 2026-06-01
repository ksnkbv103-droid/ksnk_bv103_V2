"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { getErrorMessage, mapFkError } from "./cssd-action-common";
import type { FactBaoTriRow } from "./cssd-bao-tri.types";
import { verifyCssdMaintenanceView } from "@/lib/cssd-server-gates";

/** Danh sách phiếu bảo trì (mới nhất trước). */
export async function listFactBaoTriThietBiAction(): Promise<
  { success: true; data: FactBaoTriRow[] } | { success: false; error: string }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceView();
    const { data: rows, error } = await supabase
      .from("cssd_fact_bao_tri")
      .select("id, ma_phieu, thiet_bi_id, trang_thai, ly_do, ket_qua_ghi_nhan, thoi_gian_bat_dau, thoi_gian_ket_thuc, thiet_bi:dm_thiet_bi(ten_thiet_bi)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return { success: false, error: mapFkError(error.message) };
    const data = (rows || []).map((r: Record<string, unknown>) => {
      const tb = r.thiet_bi as { ten_thiet_bi?: string } | null;
      return {
        id: String(r.id),
        ma_phieu: String(r.ma_phieu || ""),
        thiet_bi_id: String(r.thiet_bi_id || ""),
        trang_thai: String(r.trang_thai || ""),
        ly_do: r.ly_do != null ? String(r.ly_do) : null,
        ket_qua_ghi_nhan: r.ket_qua_ghi_nhan != null ? String(r.ket_qua_ghi_nhan) : null,
        thoi_gian_bat_dau: r.thoi_gian_bat_dau != null ? String(r.thoi_gian_bat_dau) : null,
        thoi_gian_ket_thuc: r.thoi_gian_ket_thuc != null ? String(r.thoi_gian_ket_thuc) : null,
        ten_thiet_bi: tb?.ten_thiet_bi ?? null,
      };
    });
    return { success: true, data };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}

/** Thiết bị có thể mở phiếu: READY/HOAT_DONG và không có mẻ TK chưa kết thúc. */
export async function listThietBiCoTheBatDauBaoTriAction(): Promise<
  { success: true; data: { id: string; ma_thiet_bi: string; ten_thiet_bi: string; trang_thai: string | null }[] } | {
    success: false;
    error: string;
  }
> {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdMaintenanceView();
    const { data: all, error } = await supabase
      .from("dm_thiet_bi")
      .select("id, ma_thiet_bi, ten_thiet_bi, trang_thai")
      .eq("is_active", true)
      .in("trang_thai", ["READY", "HOAT_DONG"])
      .order("ma_thiet_bi", { ascending: true });
    if (error) return { success: false, error: mapFkError(error.message) };

    const machineIds = (all || []).map((r) => String((r as { id?: string }).id || "")).filter(Boolean);
    let openBatchByMachine = new Set<string>();
    if (machineIds.length) {
      const { data: openRows, error: openErr } = await supabase
        .from("cssd_fact_lo_tiet_khuan")
        .select("thiet_bi_id")
        .eq("is_active", true)
        .is("ket_qua_test", null)
        .in("thiet_bi_id", machineIds);
      if (openErr) return { success: false, error: mapFkError(openErr.message) };
      openBatchByMachine = new Set((openRows || []).map((r) => String((r as { thiet_bi_id?: string | null }).thiet_bi_id || "")).filter(Boolean));
    }

    const out: { id: string; ma_thiet_bi: string; ten_thiet_bi: string; trang_thai: string | null }[] = [];
    for (const r of all || []) {
      const id = String((r as { id?: string }).id || "");
      if (openBatchByMachine.has(id)) continue;
      out.push({
        id,
        ma_thiet_bi: String((r as { ma_thiet_bi?: string }).ma_thiet_bi || ""),
        ten_thiet_bi: String((r as { ten_thiet_bi?: string }).ten_thiet_bi || ""),
        trang_thai: (r as { trang_thai?: string | null }).trang_thai ?? null,
      });
    }
    return { success: true, data: out };
  } catch (e: unknown) {
    return { success: false, error: getErrorMessage(e) };
  }
}
