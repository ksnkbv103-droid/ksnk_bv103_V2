import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "../../types/cssd.types";
import { resolveIncidentPolicy } from "../domain/cssd-incident-policy";
import { insertCssdLifecycleEvent } from "../../shared/application/cssd-lifecycle-events";
import { mapFkError, tableHasColumn, getErrorMessage } from "../../shared/cssd-db-utils";

type QuyRow = Record<string, unknown> & {
  id: string;
  ma_trang_thai_hien_tai?: string | null;
  is_red_alert?: boolean | null;
};

export async function executeIncidentReportAndRollback(
  supabase: SupabaseClient,
  data: {
    maQR: string;
    station: Station;
    typeTen: string;
    desc: string;
    errorQR?: string;
    machineId?: string;
    reporterEmail?: string | null;
    reporterAuthUserId?: string | null;
  },
  quyTrinhRow: QuyRow,
): Promise<{ incident_id: string; isRedAlert: boolean }> {
  const q = quyTrinhRow;
  const rollbackStation = resolveIncidentPolicy({
    detectionStation: data.station,
    incidentTypeTen: data.typeTen,
  });

  const { count, error: countErr } = await supabase
    .from("fact_su_co")
    .select("*", { count: "exact", head: true })
    .eq("ma_qr_quy_trinh", data.maQR);
  if (countErr) throw new Error("Loi dem su co: " + countErr.message);
  const isRedAlert = (count || 0) >= 2;

  const hasQuyTrinhIsRedAlert = await tableHasColumn(supabase, "fact_quy_trinh", "is_red_alert");
  const hasDongBang = await tableHasColumn(supabase, "fact_quy_trinh", "is_dong_bang");
  const originalState = {
    ma_trang_thai_hien_tai: q.ma_trang_thai_hien_tai,
    is_red_alert: hasQuyTrinhIsRedAlert ? Boolean(q.is_red_alert) : undefined,
    is_dong_bang: hasDongBang ? Boolean((q as { is_dong_bang?: boolean }).is_dong_bang) : undefined,
    lo_tiet_khuan_id: (q as { lo_tiet_khuan_id?: string | null }).lo_tiet_khuan_id,
  };

  const suCoPayload: Record<string, unknown> = {
    ma_qr_quy_trinh: data.maQR,
    ma_tram_phat_hien: data.station,
    ma_loai_su_co: data.typeTen,
    mo_ta: data.desc,
    is_red_alert: isRedAlert,
    ma_tram_gay_loi: rollbackStation.faultStation,
  };
  if (await tableHasColumn(supabase, "fact_su_co", "quy_trinh_id")) suCoPayload.quy_trinh_id = q.id;

  const { data: incident, error } = await supabase.from("fact_su_co").insert(suCoPayload).select().single();
  if (error || !incident) throw new Error("Lỗi lưu báo cáo: " + error?.message);

  try {
    const details: { su_co_id: string; key: string; value: string }[] = [];
    if (data.errorQR) details.push({ su_co_id: incident.id, key: "ERROR_QR", value: data.errorQR });
    if (data.machineId) details.push({ su_co_id: incident.id, key: "MACHINE_ID", value: data.machineId });
    details.push({ su_co_id: incident.id, key: "INCIDENT_KIND", value: rollbackStation.kind });
    details.push({ su_co_id: incident.id, key: "ROLLBACK_TARGET_STATION", value: rollbackStation.targetStation });
    if (data.reporterEmail)
      details.push({ su_co_id: incident.id, key: "REPORTER_EMAIL", value: String(data.reporterEmail) });
    if (data.reporterAuthUserId)
      details.push({ su_co_id: incident.id, key: "REPORTER_AUTH_USER_ID", value: String(data.reporterAuthUserId) });

    if (details.length) {
      const factDetails = details.map((x) => ({
        su_co_id: x.su_co_id,
        ma_chi_tiet_su_co: x.key,
        gia_tri_chi_tiet: x.value,
      }));
      const { error: detErr } = await supabase.from("fact_su_co_chi_tiet").insert(factDetails);
      if (detErr) throw new Error("Loi luu chi tiet su co: " + detErr.message);
    }

    const quyTrinhUpdate: Record<string, unknown> = {
      ma_trang_thai_hien_tai: rollbackStation.targetStation,
      updated_at: new Date().toISOString(),
    };
    if (rollbackStation.clearSterilizationBatchLink) quyTrinhUpdate.lo_tiet_khuan_id = null;

    if (rollbackStation.freezeSafetyLock && hasDongBang) {
      quyTrinhUpdate.is_dong_bang = true;
    }

    if (hasQuyTrinhIsRedAlert) quyTrinhUpdate.is_red_alert = isRedAlert;
    const { error: qErr } = await supabase.from("fact_quy_trinh").update(quyTrinhUpdate).eq("id", q.id);
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

    const logPayload: Record<string, unknown> = {
      ma_hanh_dong: "REPORT_INCIDENT",
      ghi_chu: `Rollback domino → ${rollbackStation.targetStation}. ${data.typeTen}: ${rollbackStation.kind}. ${data.desc?.slice(0, 160) || ""}`,
    };
    if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "quy_trinh_id")) logPayload.quy_trinh_id = q.id;
    if (await tableHasColumn(supabase, "fact_nhat_ky_quet", "ma_tram")) logPayload.ma_tram = data.station;
    const { error: logErr } = await supabase.from("fact_nhat_ky_quet").insert(logPayload);
    if (logErr) throw new Error(mapFkError(logErr.message));
  } catch (e: unknown) {
    const rollbackPayload: Record<string, unknown> = {
      ma_trang_thai_hien_tai: originalState.ma_trang_thai_hien_tai,
      lo_tiet_khuan_id: originalState.lo_tiet_khuan_id,
      updated_at: new Date().toISOString(),
    };
    if (hasQuyTrinhIsRedAlert) rollbackPayload.is_red_alert = originalState.is_red_alert;
    if (hasDongBang) rollbackPayload.is_dong_bang = originalState.is_dong_bang;
    await supabase.from("fact_quy_trinh").update(rollbackPayload).eq("id", q.id);
    await supabase.from("fact_su_co_chi_tiet").delete().eq("su_co_id", incident.id);
    await supabase.from("fact_su_co").delete().eq("id", incident.id);
    throw new Error(getErrorMessage(e) || "Loi xu ly su co");
  }

  return { incident_id: incident.id as string, isRedAlert };
}
