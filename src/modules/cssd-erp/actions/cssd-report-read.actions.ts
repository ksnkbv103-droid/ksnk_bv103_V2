"use server";

import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { verifyCssdReportView } from "@/lib/cssd-server-gates";
import {
  classifyIncidentGroupByTypeName,
  INCIDENT_GROUP_LABEL,
  INCIDENT_GROUPS,
  type IncidentGroup,
} from "@/modules/cssd-su-co/domain/cssd-incident-taxonomy";
import { getErrorMessage } from "../shared/cssd-db-utils";

const MAX_REPORT_ROWS = 8000;

export type CssdReportFilters = {
  from: string;
  to: string;
  station: string;
};

function parseIncidentType(raw: string): { group: IncidentGroup; typeName: string } {
  const text = String(raw || "").trim();
  const [prefix, rest] = text.split(":", 2);
  if (INCIDENT_GROUPS.includes(prefix as IncidentGroup) && rest) {
    return { group: prefix as IncidentGroup, typeName: rest };
  }
  return { group: classifyIncidentGroupByTypeName(text), typeName: text || "Chưa phân loại" };
}

export async function fetchCssdReportBundle(filters: CssdReportFilters) {
  const supabase = createAdminSupabaseClient();
  try {
    await verifyCssdReportView();
    const from = String(filters.from || "").trim();
    const to = String(filters.to || "").trim();
    const station = String(filters.station || "ALL").trim();

    const [resQ, resS] = await Promise.all([
      supabase
        .from("v_fact_quy_trinh_full")
        .select("*")
        .eq("is_active", true)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`)
        .limit(MAX_REPORT_ROWS),
      supabase
        .from("v_fact_su_co_full")
        .select("*")
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`)
        .limit(MAX_REPORT_ROWS),
    ]);

    if (resQ.error) return { success: false as const, error: resQ.error.message, quyTrinh: [], suCo: [] };
    if (resS.error) return { success: false as const, error: resS.error.message, quyTrinh: [], suCo: [] };

    const quyTrinhRows = (resQ.data || []).map((x: Record<string, unknown>) => ({
      ...x,
      ma_vach_qr: x.ma_qr_quy_trinh,
      trang_thai_hien_tai: x.ma_trang_thai_hien_tai,
    }));

    const suCoIds = (resS.data || []).map((x) => String((x as { id?: string }).id || "")).filter(Boolean);
    const detailMap = new Map<string, Record<string, string>>();
    if (suCoIds.length) {
      const { data: detailRows, error: detailErr } = await supabase
        .from("fact_su_co_chi_tiet")
        .select("su_co_id, ma_chi_tiet_su_co, gia_tri_chi_tiet")
        .in("su_co_id", suCoIds)
        .in("ma_chi_tiet_su_co", ["FAULT_OPERATOR", "REPORTER_EMAIL", "INCIDENT_GROUP"]);
      if (detailErr) return { success: false as const, error: detailErr.message, quyTrinh: [], suCo: [] };
      for (const row of detailRows || []) {
        const sid = String((row as { su_co_id?: string }).su_co_id || "");
        const key = String((row as { ma_chi_tiet_su_co?: string }).ma_chi_tiet_su_co || "");
        const value = String((row as { gia_tri_chi_tiet?: string }).gia_tri_chi_tiet || "");
        if (!detailMap.has(sid)) detailMap.set(sid, {});
        detailMap.get(sid)![key] = value;
      }
    }

    const suCoRows = (resS.data || []).map((x: Record<string, unknown>) => {
      const detail = detailMap.get(String(x.id || "")) || {};
      const parsed = parseIncidentType(String(x.ma_loai_su_co || ""));
      const group = INCIDENT_GROUPS.includes(String(detail.INCIDENT_GROUP) as IncidentGroup)
        ? (detail.INCIDENT_GROUP as IncidentGroup)
        : parsed.group;
      return {
        ...x,
        ma_vach_qr: x.ma_qr_quy_trinh,
        tram_phat_hien: x.ma_tram_phat_hien,
        tram_gay_loi: x.ma_tram_gay_loi,
        loai_su_co: parsed.typeName,
        incident_group: group,
        incident_group_label: INCIDENT_GROUP_LABEL[group],
        fault_operator: detail.FAULT_OPERATOR || "",
        reporter_email: detail.REPORTER_EMAIL || "",
      };
    });

    const stationFilteredSuCo =
      station === "ALL" ? suCoRows : suCoRows.filter((x) => String(x.tram_phat_hien || "") === station);
    const stationFilteredQuyTrinh =
      station === "ALL"
        ? quyTrinhRows
        : quyTrinhRows.filter((x) => String(x.trang_thai_hien_tai || "") === station);

    return { success: true as const, quyTrinh: stationFilteredQuyTrinh, suCo: stationFilteredSuCo };
  } catch (e: unknown) {
    return { success: false as const, error: getErrorMessage(e), quyTrinh: [], suCo: [] };
  }
}
