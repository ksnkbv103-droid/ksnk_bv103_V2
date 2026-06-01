import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { buildQuyTrinhTramPatch } from "@/modules/cssd-erp/lib/cssd-tram-persist";
import { insertCssdLifecycleEvent } from "@/modules/cssd-erp/shared/application/cssd-lifecycle-events";
import { mapFkError, tableHasColumn, getErrorMessage } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { resolveIncidentPolicy } from "../domain/cssd-incident-policy";
import type { IncidentGroup } from "../domain/cssd-incident-taxonomy";
import { appendQuyTrinhException } from "@/modules/cssd-erp/shared/application/cssd-quy-trinh-exceptions";

type QuyRow = Record<string, unknown> & {
  id: string;
  ma_trang_thai_hien_tai?: string | null;
  is_red_alert?: boolean | null;
};

export async function executeIncidentReportAndRollback(
  supabase: SupabaseClient,
  data: {
    maQR?: string;
    station: Station;
    incidentGroup: IncidentGroup;
    typeTen: string;
    faultStation?: Station;
    faultOperator?: string;
    desc: string;
    errorQR?: string;
    machineId?: string;
    anhMinhChung?: string;
    reporterEmail?: string | null;
    reporterAuthUserId?: string | null;
  },
  quyTrinhRow: QuyRow | null,
): Promise<{ incident_id: string; isRedAlert: boolean }> {
  const q = quyTrinhRow;
  const rollbackStation = q ? resolveIncidentPolicy({
    detectionStation: data.station,
    incidentTypeTen: data.typeTen,
    incidentGroup: data.incidentGroup,
    faultStation: data.faultStation,
  }) : null;

  let isRedAlert = false;
  if (data.maQR) {
    const { count, error: countErr } = await supabase
      .from("cssd_fact_su_co")
      .select("*", { count: "exact", head: true })
      .eq("ma_qr_quy_trinh", data.maQR);
    if (countErr) throw new Error("Loi dem su co: " + countErr.message);
    isRedAlert = (count || 0) >= 2;
  }

  const hasQuyTrinhIsRedAlert = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_red_alert");
  const hasDongBang = await tableHasColumn(supabase, "cssd_fact_quy_trinh", "is_dong_bang");
  
  const originalState = q ? {
    tram_hien_tai_id: (q as { tram_hien_tai_id?: string | null }).tram_hien_tai_id,
    is_red_alert: hasQuyTrinhIsRedAlert ? Boolean(q.is_red_alert) : undefined,
    is_dong_bang: hasDongBang ? Boolean((q as { is_dong_bang?: boolean }).is_dong_bang) : undefined,
    lo_tiet_khuan_id: (q as { lo_tiet_khuan_id?: string | null }).lo_tiet_khuan_id,
  } : null;

  const attributes: Record<string, string> = {};
  if (data.errorQR) attributes.ERROR_QR = data.errorQR;
  if (data.machineId) attributes.MACHINE_ID = data.machineId;
  if (data.faultOperator) attributes.FAULT_OPERATOR = data.faultOperator;
  if (data.anhMinhChung) attributes.ANH_MINH_CHUNG = data.anhMinhChung;

  attributes.INCIDENT_GROUP = data.incidentGroup;
  attributes.INCIDENT_KIND = rollbackStation ? rollbackStation.kind : "GENERAL_INCIDENT";
  attributes.ROLLBACK_TARGET_STATION = rollbackStation ? rollbackStation.targetStation : "NONE";

  if (data.reporterEmail) attributes.REPORTER_EMAIL = String(data.reporterEmail);
  if (data.reporterAuthUserId) attributes.REPORTER_AUTH_USER_ID = String(data.reporterAuthUserId);

  const suCoPayload: Record<string, unknown> = {
    ma_qr_quy_trinh: data.maQR || null,
    ma_tram_phat_hien: data.station,
    incident_group: data.incidentGroup,
    incident_type_label: data.typeTen,
    mo_ta: data.desc,
    is_red_alert: isRedAlert,
    ma_tram_gay_loi: rollbackStation ? rollbackStation.faultStation : null,
    attributes,
  };
  if (q && await tableHasColumn(supabase, "cssd_fact_su_co", "quy_trinh_id")) suCoPayload.quy_trinh_id = q.id;

  const { data: incident, error } = await supabase.from("cssd_fact_su_co").insert(suCoPayload).select().single();
  if (error || !incident) throw new Error("Lỗi lưu báo cáo: " + error?.message);

  try {
    if (q && rollbackStation) {
      const rollbackPatch = await buildQuyTrinhTramPatch(supabase, rollbackStation.targetStation);
      const quyTrinhUpdate: Record<string, unknown> = {
        ...rollbackPatch,
        updated_at: new Date().toISOString(),
      };
      if (rollbackStation.clearSterilizationBatchLink) quyTrinhUpdate.lo_tiet_khuan_id = null;

      if (rollbackStation.freezeSafetyLock && hasDongBang) {
        quyTrinhUpdate.is_dong_bang = true;
      }

      if (hasQuyTrinhIsRedAlert) quyTrinhUpdate.is_red_alert = isRedAlert;
      const { error: qErr } = await supabase.from("cssd_fact_quy_trinh").update(quyTrinhUpdate).eq("id", q.id);
      if (qErr) throw new Error(mapFkError(qErr.message));

      const lc = await insertCssdLifecycleEvent(supabase, {
        quy_trinh_id: q.id,
        ma_su_kien: "SU_CO_DOMINO_ROLLBACK",
        ma_tram: data.station,
        ghi_chu: `Sự cố: ${data.typeTen} → ${rollbackStation.targetStation} (fault ${rollbackStation.faultStation})`,
        payload: {
          ma_qr_quy_trinh: data.maQR,
          tram_phat_hien: data.station,
          rollback: rollbackStation,
          mo_ta: data.desc,
          reporter_email: data.reporterEmail,
          reporter_user_id: data.reporterAuthUserId,
        },
      });
      if (!lc.ok && !/fact_cssd_lifecycle_event|does not exist/i.test(lc.message)) throw new Error(lc.message);

      await appendQuyTrinhException(supabase, q.id, {
        su_kien: "REPORT_INCIDENT",
        tu_tram: data.station,
        den_tram: rollbackStation.targetStation,
        ly_do: `Sự cố ${data.typeTen}. ${data.desc?.slice(0, 160) || ""}`,
        nguoi_thao_tac: data.faultOperator || data.reporterEmail || "Nhân viên báo cáo",
      });
    }
  } catch (e: unknown) {
    if (q && originalState) {
      const rollbackPayload: Record<string, unknown> = {
        tram_hien_tai_id: originalState.tram_hien_tai_id,
        lo_tiet_khuan_id: originalState.lo_tiet_khuan_id,
        updated_at: new Date().toISOString(),
      };
      if (hasQuyTrinhIsRedAlert) rollbackPayload.is_red_alert = originalState.is_red_alert;
      if (hasDongBang) rollbackPayload.is_dong_bang = originalState.is_dong_bang;
      await supabase.from("cssd_fact_quy_trinh").update(rollbackPayload).eq("id", q.id);
    }
    await supabase.from("cssd_fact_su_co").delete().eq("id", incident.id);
    throw new Error(getErrorMessage(e) || "Loi xu ly su co");
  }

  return { incident_id: incident.id as string, isRedAlert };
}

