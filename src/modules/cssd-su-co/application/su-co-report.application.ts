import type { SupabaseClient } from "@supabase/supabase-js";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { buildQuyTrinhTramPatch } from "@/modules/cssd-erp/lib/cssd-tram-persist";
import { insertCssdLifecycleEvent } from "@/modules/cssd-erp/shared/application/cssd-lifecycle-events";
import { mapFkError, tableHasColumn, getErrorMessage } from "@/modules/cssd-erp/shared/cssd-db-utils";
import { buildIncidentAttributes, resolveProcessBatchLink } from "../domain/cssd-incident-attributes";
import { resolveIncidentPolicy } from "../domain/cssd-incident-policy";
import { isBatchQcFailTypeId } from "../domain/cssd-incident-taxonomy";
import { applyBatchRecallAndHoldMachine } from "./batch-recall-hold.application";
import {
  CAUSE_CLASS_LABEL,
  defaultCauseClass,
  type CauseClass,
  type IncidentGroup,
} from "../domain/cssd-incident-taxonomy";
import { resolveCssdOperatorNhanSuId } from "@/modules/cssd-erp/shared/application/cssd-operator-resolve";
import { appendQuyTrinhException } from "@/modules/cssd-erp/shared/application/cssd-quy-trinh-exceptions";
import {
  commitInstrumentReportRpc,
  prepareInstrumentLedgerLine,
  type InstrumentIncidentPayload,
  type SuCoCommitPayload,
} from "./instrument-incident.application";
import {
  SET_RECONCILE_TYPE_ID,
  validateInstrumentDoorLines,
  type SetReconcileLineInput,
} from "@/lib/domain/cssd-set-reconcile";
import { buildSetReconcileAttributePatch } from "../domain/cssd-set-reconcile-attrs";
import { collectSubmittedSetReconcileWrite } from "./set-reconcile-incident.application";

type QuyRow = Record<string, unknown> & {
  id: string;
  ma_trang_thai_hien_tai?: string | null;
  is_red_alert?: boolean | null;
  lo_tiet_khuan_id?: string | null;
};

export async function executeIncidentReportAndRollback(
  supabase: SupabaseClient,
  data: {
    maQR?: string;
    station: Station;
    incidentGroup: IncidentGroup;
    typeTen: string;
    typeId?: string;
    causeClass?: CauseClass;
    faultStation?: Station;
    faultOperator?: string;
    faultOperatorId?: string;
    nguoiPhatHien?: string;
    nguoiPhatHienId?: string;
    thoiGianPhatHien?: string;
    desc: string;
    errorQR?: string;
    machineId?: string;
    anhMinhChung?: string;
    reporterEmail?: string | null;
    reporterAuthUserId?: string | null;
    instrumentPayload?: InstrumentIncidentPayload;
    setReconcilePayload?: {
      boDungCuId: string;
      draftIncidentId?: string;
      quyTrinhId?: string | null;
      maBo?: string;
      tenBo?: string;
      lines: SetReconcileLineInput[];
    };
    processPayload?: { loTietKhuanId?: string; maLo?: string; quyTrinhId?: string | null };
    confirmDuplicate?: boolean;
  },
  quyTrinhRow: QuyRow | null,
): Promise<{
  incident_id: string;
  isRedAlert: boolean;
  deduped?: boolean;
  recalledCount?: number;
  machineHeld?: boolean;
  recalled?: { quyTrinhId: string; maBo: string; tenBo: string; maLo: string }[];
  listedUsed?: { quyTrinhId: string; maBo: string; tenBo: string; maLo: string; maCaMoId?: string }[];
}> {
  const q = quyTrinhRow;
  const causeClass = data.causeClass || defaultCauseClass(data.incidentGroup);
  const causeLabel = CAUSE_CLASS_LABEL[causeClass];
  const typeId = String(data.typeId || "").trim() || undefined;
  const batchLink = resolveProcessBatchLink(data.processPayload, q);
  let maLo = batchLink.maLo;
  if (batchLink.loTietKhuanId && !maLo) {
    const { data: meRow } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("ma_lo_tiet_khuan")
      .eq("id", batchLink.loTietKhuanId)
      .maybeSingle();
    maLo = String((meRow as { ma_lo_tiet_khuan?: string | null } | null)?.ma_lo_tiet_khuan || "").trim() || undefined;
  }
  let loTietKhuanId = batchLink.loTietKhuanId;
  if (!loTietKhuanId && maLo) {
    const { data: meByMa } = await supabase
      .from("cssd_fact_lo_tiet_khuan")
      .select("id")
      .eq("ma_lo_tiet_khuan", maLo)
      .maybeSingle();
    loTietKhuanId = String((meByMa as { id?: string } | null)?.id || "").trim() || undefined;
  }
  const processPayload = {
    ...data.processPayload,
    loTietKhuanId,
    maLo,
  };

  const batchFail = data.incidentGroup === "PROCESS" && isBatchQcFailTypeId(typeId);
  if (batchFail && loTietKhuanId) {
    const nguoiBaoId = await resolveCssdOperatorNhanSuId(supabase, {
      authUserId: data.reporterAuthUserId,
      email: data.reporterEmail,
    });
    const rec = await applyBatchRecallAndHoldMachine(supabase, {
      loTietKhuanId,
      mode: typeId === "PROCESS_BI_POSITIVE" ? "BI_DUONG" : "QC_FAIL",
      actorUserId: data.reporterAuthUserId,
      nguoiNhanSuId: nguoiBaoId,
      typeId: typeId || "PROCESS_STERILIZATION_FAIL",
      typeTen: data.typeTen,
      moTa: data.desc,
      reporterEmail: data.reporterEmail,
      maQr: data.maQR,
      quyTrinhId: q?.id ?? processPayload.quyTrinhId ?? null,
    });
    return {
      incident_id: rec.incidentId,
      isRedAlert: rec.isRedAlert,
      deduped: !rec.incidentCreated,
      recalledCount: rec.recalled.length,
      machineHeld: rec.machineHeld,
      recalled: rec.recalled,
      listedUsed: rec.listedUsed,
    };
  }

  const skipWorkflowRollback = data.incidentGroup === "INSTRUMENT";
  const rollbackStation =
    !skipWorkflowRollback && (q || batchFail)
      ? resolveIncidentPolicy({
          detectionStation: data.station,
          incidentTypeTen: data.typeTen,
          incidentGroup: data.incidentGroup,
          faultStation: data.faultStation,
          typeId,
          currentStation: q?.ma_trang_thai_hien_tai || data.station,
        })
      : null;

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

  const originalState = q
    ? {
        tram_hien_tai_id: (q as { tram_hien_tai_id?: string | null }).tram_hien_tai_id,
        is_red_alert: hasQuyTrinhIsRedAlert ? Boolean(q.is_red_alert) : undefined,
        is_dong_bang: hasDongBang ? Boolean((q as { is_dong_bang?: boolean }).is_dong_bang) : undefined,
        lo_tiet_khuan_id: (q as { lo_tiet_khuan_id?: string | null }).lo_tiet_khuan_id,
      }
    : null;

  const attributes = buildIncidentAttributes({
    incidentGroup: data.incidentGroup,
    typeTen: data.typeTen,
    typeId,
    causeClass,
    causeLabel,
    incidentKind: rollbackStation ? rollbackStation.kind : "GENERAL_INCIDENT",
    rollbackTargetStation: rollbackStation ? rollbackStation.targetStation : "NONE",
    errorQR: data.errorQR || processPayload.maLo,
    machineId: data.machineId,
    faultOperator: data.faultOperator,
    faultOperatorId: data.faultOperatorId,
    nguoiPhatHien: data.nguoiPhatHien,
    nguoiPhatHienId: data.nguoiPhatHienId,
    thoiGianPhatHien: data.thoiGianPhatHien,
    anhMinhChung: data.anhMinhChung,
    reporterEmail: data.reporterEmail,
    reporterAuthUserId: data.reporterAuthUserId,
    loTietKhuanId: processPayload.loTietKhuanId,
    maLo: processPayload.maLo,
  });
  const setReconcile = data.setReconcilePayload;
  if (setReconcile) {
    const lineErr = validateInstrumentDoorLines(typeId || SET_RECONCILE_TYPE_ID, setReconcile.lines);
    if (lineErr) throw new Error(lineErr);
    Object.assign(
      attributes,
      buildSetReconcileAttributePatch({
        boDungCuId: setReconcile.boDungCuId,
        status: "NONE",
        snapshot: {
          boDungCuId: setReconcile.boDungCuId,
          maBo: setReconcile.maBo,
          tenBo: setReconcile.tenBo,
          lines: setReconcile.lines,
        },
      }),
    );
  }

  const loaiSuCo = await resolveLoaiSuCoLookup(supabase, causeClass);
  const nguoiBaoId = await resolveCssdOperatorNhanSuId(supabase, {
    authUserId: data.reporterAuthUserId,
    email: data.reporterEmail,
  });

  const suCoPayload: Record<string, unknown> = {
    ma_qr_quy_trinh: data.maQR || null,
    ma_tram_phat_hien: data.station,
    mo_ta: data.desc,
    is_red_alert: isRedAlert,
    ma_tram_gay_loi: rollbackStation ? rollbackStation.faultStation : null,
    attributes,
  };
  if (q && await tableHasColumn(supabase, "cssd_fact_su_co", "quy_trinh_id")) suCoPayload.quy_trinh_id = q.id;
  if (loaiSuCo && await tableHasColumn(supabase, "cssd_fact_su_co", "loai_su_co_id")) {
    suCoPayload.loai_su_co_id = loaiSuCo.id;
  }
  if (nguoiBaoId && await tableHasColumn(supabase, "cssd_fact_su_co", "nguoi_bao_id")) {
    suCoPayload.nguoi_bao_id = nguoiBaoId;
  }

  const draftId = String(setReconcile?.draftIncidentId || "").trim();
  const commitPayload: SuCoCommitPayload = {
    ma_qr_quy_trinh: data.maQR || null,
    ma_tram_phat_hien: data.station,
    mo_ta: data.desc,
    is_red_alert: isRedAlert,
    ma_tram_gay_loi: (suCoPayload.ma_tram_gay_loi as string | null) ?? null,
    attributes,
    quy_trinh_id: q?.id ?? null,
    loai_su_co_id: loaiSuCo?.id ?? null,
    nguoi_bao_id: nguoiBaoId,
  };
  let incident: { id: string } | null = null;
  let atomicWrite = false;

  try {
    if (setReconcile) {
      atomicWrite = true;
      const prepared = await collectSubmittedSetReconcileWrite(supabase, draftId, {
        boDungCuId: setReconcile.boDungCuId,
        quyTrinhId: setReconcile.quyTrinhId || (q?.id as string | undefined) || null,
        maQr: data.maQR,
        headerNote: data.desc,
        typeId,
        snapshot: {
          boDungCuId: setReconcile.boDungCuId,
          maBo: setReconcile.maBo,
          tenBo: setReconcile.tenBo,
          lines: setReconcile.lines,
        },
        existingAttrs: attributes,
      });
      const committed = await commitInstrumentReportRpc(supabase, {
        draftId: draftId || null,
        suCo: { ...commitPayload, attributes: prepared.attributes },
        lines: prepared.lines,
        boDungCuId: setReconcile.boDungCuId,
        touchNgayKiemKe: true,
        nguoiThucHienId: nguoiBaoId,
      });
      incident = { id: String(committed.su_co_id) };
    } else if (data.incidentGroup === "INSTRUMENT" && data.instrumentPayload) {
      const line = prepareInstrumentLedgerLine({
        ...data.instrumentPayload,
        typeId: data.instrumentPayload.typeId,
        note: data.instrumentPayload.note || data.desc,
        maQrNguon: data.instrumentPayload.maQrNguon || data.maQR,
      });
      if (line) {
        atomicWrite = true;
        const committed = await commitInstrumentReportRpc(supabase, {
          draftId: null,
          suCo: commitPayload,
          lines: [line],
          boDungCuId: data.instrumentPayload.boDungCuId,
          touchNgayKiemKe: false,
          nguoiThucHienId: nguoiBaoId,
        });
        incident = { id: String(committed.su_co_id) };
      }
    }

    if (!incident) {
      if (draftId) {
        const { data: updated, error: updErr } = await supabase
          .from("cssd_fact_su_co")
          .update(suCoPayload)
          .eq("id", draftId)
          .select("id")
          .maybeSingle();
        if (updErr) throw new Error("Lỗi cập nhật phiếu rà soát: " + updErr.message);
        if (!updated?.id) throw new Error("Không tìm thấy phiếu nháp để gửi.");
        incident = { id: String(updated.id) };
      } else {
        const inserted = await supabase.from("cssd_fact_su_co").insert(suCoPayload).select("id").single();
        if (inserted.error || !inserted.data) throw new Error("Lỗi lưu báo cáo: " + inserted.error?.message);
        incident = { id: String(inserted.data.id) };
      }
    }
    if (!incident) throw new Error("Không lưu được phiếu sự cố.");

    if (q && rollbackStation) {
      const rollbackPatch = await buildQuyTrinhTramPatch(supabase, rollbackStation.targetStation);
      const quyTrinhUpdate: Record<string, unknown> = {
        ...rollbackPatch,
        updated_at: new Date().toISOString(),
      };
      if (rollbackStation.clearSterilizationBatchLink && !rollbackStation.recallEntireBatch) {
        quyTrinhUpdate.lo_tiet_khuan_id = null;
      }

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
    } else if (q && isRedAlert && hasQuyTrinhIsRedAlert) {
      // Không rollback trạm (vd. sự cố dụng cụ) nhưng vẫn gắn cờ đỏ trên quy trình khi DB đã có cột.
      const { error: alertErr } = await supabase
        .from("cssd_fact_quy_trinh")
        .update({ is_red_alert: true, updated_at: new Date().toISOString() })
        .eq("id", q.id);
      if (alertErr) throw new Error(mapFkError(alertErr.message));
    }

    return { incident_id: incident.id as string, isRedAlert };
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
    // Nháp và phiếu đã ghi sổ atomic không xóa ở đây — Postgres rollback cả transaction RPC.
    if (!draftId && !atomicWrite && incident?.id) {
      await supabase.from("cssd_fact_su_co").delete().eq("id", incident.id);
    }
    throw new Error(getErrorMessage(e) || "Loi xu ly su co");
  }
}

async function resolveLoaiSuCoLookup(
  supabase: SupabaseClient,
  code: CauseClass,
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from("sys_lookup_value")
    .select("id, name")
    .eq("category_type", "LOAI_SU_CO")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data?.id) return null;
  return { id: String(data.id), name: String(data.name || "") };
}


