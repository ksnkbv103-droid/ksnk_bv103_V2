"use server";

import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdIncidentCreate } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { resolveCssdCodeWithClient } from "@/modules/cssd-erp/shared/application/cssd-qr-hub";
import { readFaultStationOperator } from "../domain/cssd-incident-trace";

export async function fetchSuCoFormCatalog() {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdIncidentCreate();
    const [mRes, hRes] = await Promise.all([
      supabase
        .from("cssd_dm_thiet_bi")
        .select("id, ma_thiet_bi, ten_thiet_bi")
        .eq("is_active", true)
        .order("ten_thiet_bi"),
      supabase.from("cssd_dm_hoa_chat").select("id, ten_hoa_chat, ma_hoa_chat").eq("is_active", true).order("ten_hoa_chat"),
    ]);
    if (mRes.error) {
      return { success: false as const, error: mRes.error.message, machines: [], chemicals: [] };
    }

    const machines = (mRes.data || []).map(
      (m: { id: string; ma_thiet_bi?: string; ten_thiet_bi?: string }) => ({
        id: m.id,
        ten: [m.ma_thiet_bi, m.ten_thiet_bi].filter(Boolean).join(" — ") || m.id,
      }),
    );
    const chemicals = (hRes?.data || []).map((h: { id: string; ten_hoa_chat?: string; ma_hoa_chat?: string }) => ({
      id: h.id,
      ten: h.ten_hoa_chat || "",
      ma: h.ma_hoa_chat || "",
    }));
    return { success: true as const, machines, chemicals };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), machines: [], chemicals: [] };
  }
}

/** Truy vết người đã thực hiện khâu lỗi trong chu trình chưa hoàn thiện. */
export async function resolveSuCoFaultTrace(maQR: string, faultStation: Station) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdIncidentCreate();
    const raw = String(maQR || "").trim().toUpperCase();
    if (!raw) return { success: false as const, error: "Thiếu mã QR bộ dụng cụ." };

    const resolved = await resolveCssdCodeWithClient(supabase, raw);
    if (resolved.targetType === "MACHINE") {
      return { success: false as const, error: "Mã quét là máy — cần mã QR bộ dụng cụ." };
    }

    const { data: quyTrinh, error } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("ma_qr_quy_trinh", resolved.code)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    if (!quyTrinh) return { success: false as const, error: "Không tìm thấy chu trình cho mã QR này." };

    const row = quyTrinh as Record<string, unknown>;
    const { operatorId, stationTime } = readFaultStationOperator(row, faultStation);
    let operatorName: string | null = null;
    if (operatorId) {
      const { data: ns } = await supabase
        .from("mdm_nhan_su")
        .select("ho_ten")
        .eq("id", operatorId)
        .maybeSingle();
      operatorName = String((ns as { ho_ten?: string | null } | null)?.ho_ten || "").trim() || null;
    }

    return {
      success: true as const,
      maQR: resolved.code,
      quyTrinhId: String(row.id || ""),
      operatorName,
      operatorId,
      stationTime,
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
