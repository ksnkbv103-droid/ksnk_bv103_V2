"use server";

import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdIncidentCreate } from "@/lib/cssd-server-gates";
import { getErrorMessage } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { resolveCssdCodeWithClient } from "@/modules/cssd-erp/shared/application/cssd-qr-hub";
import { INCIDENT_STATION_OPTIONS } from "../domain/cssd-incident-taxonomy";
import { listCyclePerformers, readFaultStationOperator } from "../domain/cssd-incident-trace";

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

/** Danh mục nhân sự active — chọn người phát hiện / người liên quan. */
export async function listSuCoNhanSuOptionsAction(search?: string) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdIncidentCreate();
    let q = supabase
      .from("mdm_nhan_su")
      .select("id, ho_ten, ma_nv")
      .eq("is_active", true)
      .order("ho_ten")
      .limit(400);
    const term = String(search || "").trim();
    if (term) {
      q = q.or(`ho_ten.ilike.%${term}%,ma_nv.ilike.%${term}%`);
    }
    const { data, error } = await q;
    if (error) return { success: false as const, error: error.message, data: [] as const };
    return {
      success: true as const,
      data: (data || []).map((r) => ({
        id: String(r.id || ""),
        ho_ten: String(r.ho_ten || "").trim() || "—",
        ma_nv: r.ma_nv != null ? String(r.ma_nv).trim() : "",
      })).filter((x) => x.id),
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), data: [] as const };
  }
}

/** Truy vết người đã thực hiện khâu lỗi + danh sách người trên chu kỳ. */
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
    if (resolved.targetType !== "INSTRUMENT_SET" || !resolved.workflowId) {
      return { success: false as const, error: "Không tìm thấy chu trình cho mã QR này." };
    }

    const { data: quyTrinh, error } = await supabase
      .from("v_cssd_quy_trinh_full")
      .select("*")
      .eq("id", resolved.workflowId)
      .maybeSingle();
    if (error) return { success: false as const, error: error.message };
    if (!quyTrinh) return { success: false as const, error: "Không tìm thấy chu trình cho mã QR này." };

    const row = quyTrinh as Record<string, unknown>;
    const { operatorId, stationTime } = readFaultStationOperator(row, faultStation);
    const performers = listCyclePerformers(row);
    const ids = Array.from(
      new Set([...(operatorId ? [operatorId] : []), ...performers.map((p) => p.operatorId)]),
    );

    const nameById = new Map<string, string>();
    if (ids.length > 0) {
      const { data: nsRows } = await supabase.from("mdm_nhan_su").select("id, ho_ten").in("id", ids);
      for (const ns of nsRows || []) {
        const id = String((ns as { id?: string }).id || "");
        const name = String((ns as { ho_ten?: string | null }).ho_ten || "").trim();
        if (id && name) nameById.set(id, name);
      }
    }

    const stationLabel = (s: Station) =>
      INCIDENT_STATION_OPTIONS.find((x) => x.value === s)?.label || s;

    const cyclePerformers = performers
      .map((p) => ({
        station: p.station,
        stationLabel: stationLabel(p.station),
        operatorId: p.operatorId,
        operatorName: nameById.get(p.operatorId) || "",
        stationTime: p.stationTime,
      }))
      .filter((p) => Boolean(p.operatorName));

    const operatorName = operatorId ? nameById.get(operatorId) || null : null;

    return {
      success: true as const,
      maQR: resolved.code,
      quyTrinhId: String(row.id || ""),
      operatorName,
      operatorId,
      stationTime,
      cyclePerformers,
    };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e) };
  }
}
