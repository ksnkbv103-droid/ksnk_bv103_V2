"use client";

/**
 * Form xác định ca NKBV nhúng trên tờ bệnh án (Hub BA — panel phải).
 * Cùng logic / UI với modal danh sách phiếu — điền dấu hiệu / triệu chứng theo loại NK.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { FileText, Printer } from "lucide-react";
import NkbvCssdRcaPanel from "@/modules/giam-sat-nkbv/components/NkbvCssdRcaPanel";
import NkbvDiagnosticCaseForm from "@/modules/giam-sat-nkbv/components/NkbvDiagnosticCaseForm";
import NkbvCasePrintView from "@/modules/giam-sat-nkbv/components/NkbvCasePrintView";
import NkbvAdjudicationPanel from "@/modules/giam-sat-nkbv/components/NkbvAdjudicationPanel";
import { getDevicePrefillForStay } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-device-registry.actions";
import { syncFormSymptomToBaTimeline } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv.actions";
import type { DeviceRegistryType } from "@/modules/giam-sat-nkbv/lib/nkbv-shared-device-days";
import type { BaTimelineMilestone } from "@/modules/giam-sat-nkbv/lib/nkbv-ba-timeline-core";
import {
  SYMPTOM_DATE_TO_TIMELINE,
  prefillSymptomDatesFromTimeline,
} from "@/modules/giam-sat-nkbv/lib/nkbv-symptom-timeline-bridge";
import { isNkbvBaAnalysisDraftId } from "@/modules/giam-sat-nkbv/lib/nkbv-ba-analysis-draft";
import { toast } from "sonner";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { useNkbvChecklistModalState } from "./useNkbvChecklistModalState";
import { patchSymptomReview } from "../lib/nkbv-symptom-review";
import { NkbvSymptomReviewProvider } from "./sub-forms/NkbvSymptomReviewContext";
import { formatNkbvChecklistTypeLabel } from "../lib/nkbv-loai-labels";
import { formatDateVi } from "@/lib/format-datetime-vi";

export type NkbvBaCaseSheetProps = {
  row: Record<string, unknown>;
  onSuccess: () => void;
  allowedEdit: boolean;
  khoas?: Array<{ id: string; ten_danh_muc: string }>;
  milestoneLabel?: string;
  /** Timeline BA — prefill triệu chứng ∈ IWP + đồng bộ ngược. */
  timelineMilestones?: BaTimelineMilestone[];
  onTimelineSynced?: () => void;
  /** Hub gọi để đưa mốc triệu chứng timeline vào form. */
  attachSymptomRef?: React.MutableRefObject<
    ((input: { key: string; date: string; label?: string }) => boolean) | null
  >;
  /**
   * Khi form đang là bản nháp trên BA — gọi để neo phiếu DB trước khi lưu/chốt.
   * Trả về row đầy đủ (có id thật) hoặc null.
   */
  persistDraft?: () => Promise<Record<string, unknown> | null>;
};

export default function NkbvBaCaseSheet({
  row: rowProp,
  onSuccess,
  allowedEdit,
  khoas = [],
  milestoneLabel,
  timelineMilestones = [],
  onTimelineSynced,
  attachSymptomRef,
  persistDraft,
}: NkbvBaCaseSheetProps) {
  const [row, setRow] = useState(rowProp);
  useEffect(() => {
    setRow(rowProp);
  }, [rowProp]);
  const {
    submitting,
    adjudicating,
    treatmentHistory,
    symptomDates,
    setSymptomDates,
    ghiChuTuyBien,
    setGhiChuTuyBien,
    suggestedType,
    suggestedReason,
    lockedType,
    suspectedType,
    setSuspectedType,
    checklistType,
    clinicalPathway,
    bsiForm,
    setBsiForm,
    vaeForm,
    setVaeForm,
    utiForm,
    setUtiForm,
    ssiForm,
    setSsiForm,
    ch17Form,
    setCh17Form,
    symptomReview,
    setSymptomReview,
    handleAddStay,
    handleDeleteStay,
    liveCdcMetrics,
    liveEvaluation,
    handleSaveChecklist,
    handleAdjudicate,
    ngayVaoVienEffective,
    handleSyncAdmissionDate,
    benhAnLoaded,
    benhAnMissing,
  } = useNkbvChecklistModalState({
    row,
    onClose: () => undefined,
    onSuccess,
    allowedEdit,
  });

  const [clinicalConfirmed, setClinicalConfirmed] = useState(false);
  const [ksnkConfirmed, setKsnkConfirmed] = useState(false);
  const canConfirmKsnk = allowedEdit;

  const activeForm = useMemo(() => {
    if (checklistType === "BSI") return bsiForm as Record<string, unknown> | null;
    if (checklistType === "UTI") return utiForm as Record<string, unknown> | null;
    if (checklistType === "SSI") return ssiForm as Record<string, unknown> | null;
    if (checklistType === "CH17") return ch17Form as Record<string, unknown> | null;
    return vaeForm as Record<string, unknown> | null;
  }, [checklistType, bsiForm, utiForm, ssiForm, ch17Form, vaeForm]);

  const lockStatus: "DRAFT" | "DA_CHOT" = useMemo(() => {
    const ma = String(
      (row as { trang_thai_ma?: string }).trang_thai_ma ||
        (row as { trang_thai_row?: { ma_trang_thai?: string } }).trang_thai_row?.ma_trang_thai ||
        "",
    ).toUpperCase();
    const ten = String((row as { trang_thai_ten?: string }).trang_thai_ten || "").toLowerCase();
    if (
      ma.includes("XAC_NHAN") ||
      ma.includes("CHOT") ||
      ma.includes("APPROV") ||
      ten.includes("xác nhận") ||
      ten.includes("đã chốt")
    ) {
      return "DA_CHOT";
    }
    return "DRAFT";
  }, [row]);

  const prefillKeyRef = useRef("");
  useEffect(() => {
    if (!allowedEdit || !row.ma_benh_an) return;
    const map: Partial<Record<string, DeviceRegistryType>> = {
      BSI: "CENTRAL_LINE",
      UTI: "FOLEY",
      VAE: "VENTILATOR",
      VAP: "VENTILATOR",
      HAP: "VENTILATOR",
    };
    const want = map[checklistType] || (clinicalPathway === "VAE" ? "VENTILATOR" : undefined);
    if (!want) return;
    const key = `${String(row.ma_benh_an)}:${checklistType}:${want}`;
    if (prefillKeyRef.current === key) return;
    prefillKeyRef.current = key;

    void (async () => {
      const pre = await getDevicePrefillForStay(String(row.ma_benh_an || ""), want);
      if (!pre.success || !pre.device_placed_date) return;
      if (checklistType === "BSI") {
        setBsiForm((prev) =>
          prev && !prev.device_placed_date
            ? {
                ...prev,
                device_placed_date: pre.device_placed_date!,
                device_removed_date: pre.device_removed_date || undefined,
              }
            : prev,
        );
      } else if (checklistType === "UTI") {
        setUtiForm((prev) =>
          prev && !prev.device_placed_date
            ? {
                ...prev,
                device_placed_date: pre.device_placed_date!,
                device_removed_date: pre.device_removed_date || undefined,
              }
            : prev,
        );
      } else if (clinicalPathway === "VAE" || clinicalPathway === "PNEU") {
        setVaeForm((prev) =>
          prev && !prev.device_placed_date
            ? {
                ...prev,
                device_placed_date: pre.device_placed_date!,
                device_removed_date: pre.device_removed_date || undefined,
              }
            : prev,
        );
      }
    })();
  }, [
    allowedEdit,
    checklistType,
    clinicalPathway,
    row.ma_benh_an,
    setBsiForm,
    setUtiForm,
    setVaeForm,
  ]);

  useEffect(() => {
    setClinicalConfirmed(false);
    setKsnkConfirmed(false);
  }, [row.id]);

  const prefillDoneRef = useRef("");
  useEffect(() => {
    const caseId = String(row.id || "");
    if (!caseId || !timelineMilestones.length) return;
    const stamp = `${caseId}:${liveCdcMetrics?.iwp_start || ""}:${liveCdcMetrics?.iwp_end || ""}:${timelineMilestones.length}`;
    if (prefillDoneRef.current === stamp) return;
    prefillDoneRef.current = stamp;
    const pathway = clinicalPathway || checklistType;
    const mapContext =
      pathway === "SSI"
        ? {
            syndrome: "SSI" as const,
            ssiDepth:
              (ssiForm as { infection_depth?: string } | null)?.infection_depth ||
              "SUPERFICIAL",
          }
        : pathway === "PNEU" ||
            pathway === "VAE" ||
            pathway === "UTI" ||
            pathway === "BSI"
          ? { syndrome: pathway }
          : undefined;
    setSymptomDates((prev) =>
      prefillSymptomDatesFromTimeline({
        milestones: timelineMilestones,
        iwpStart: liveCdcMetrics?.iwp_start,
        iwpEnd: liveCdcMetrics?.iwp_end,
        existing: prev,
        mapContext,
      }),
    );
  }, [
    row.id,
    timelineMilestones,
    liveCdcMetrics?.iwp_start,
    liveCdcMetrics?.iwp_end,
    setSymptomDates,
    clinicalPathway,
    checklistType,
    ssiForm,
  ]);

  const syncSymptomToTimeline = async (key: string, date: string) => {
    const meta = SYMPTOM_DATE_TO_TIMELINE[key];
    const maBa = String(row.ma_benh_an || "");
    if (!meta || !maBa || !allowedEdit) return;
    const res = await syncFormSymptomToBaTimeline({
      ma_benh_an: maBa,
      criteria_key: meta.criteriaKey,
      milestone_kind: meta.milestoneKind,
      title: meta.title,
      milestone_date: date || null,
      form_field_key: key,
    });
    if (!res.success) {
      toast.error(res.error || "Không đồng bộ timeline");
      return;
    }
    onTimelineSynced?.();
  };

  const handleSymptomDateChange = (key: string, date: string) => {
    setSymptomDates((prev) => ({ ...prev, [key]: date }));
    void syncSymptomToTimeline(key, date);
  };

  useEffect(() => {
    if (!attachSymptomRef) return;
    attachSymptomRef.current = ({ key, date, label }) => {
      if (!allowedEdit) return false;
      setSymptomDates((prev) => ({ ...prev, [key]: date }));
      void syncSymptomToTimeline(key, date);
      toast.success(
        label
          ? `Đã đưa «${label}» (${date}) vào khung tiêu chuẩn`
          : `Đã gắn triệu chứng ngày ${date}`,
      );
      return true;
    };
    return () => {
      attachSymptomRef.current = null;
    };
  });

  const handlePrefillDevice = async () => {
    const map: Partial<Record<string, DeviceRegistryType>> = {
      BSI: "CENTRAL_LINE",
      UTI: "FOLEY",
      VAE: "VENTILATOR",
      VAP: "VENTILATOR",
      HAP: "VENTILATOR",
    };
    const want = map[checklistType] || (clinicalPathway === "VAE" ? "VENTILATOR" : undefined);
    if (!want) {
      toast.message("Loại phiếu này không dùng dụng cụ xâm lấn theo dõi");
      return;
    }
    const pre = await getDevicePrefillForStay(String(row.ma_benh_an || ""), want);
    if (!pre.success || !pre.device_placed_date) {
      toast.error("Chưa tích dụng cụ trên lưới bệnh án");
      return;
    }
    if (checklistType === "BSI" && bsiForm) {
      setBsiForm({
        ...bsiForm,
        device_placed_date: pre.device_placed_date,
        device_removed_date: pre.device_removed_date || undefined,
      });
    } else if (checklistType === "UTI" && utiForm) {
      setUtiForm({
        ...utiForm,
        device_placed_date: pre.device_placed_date,
        device_removed_date: pre.device_removed_date || undefined,
      });
    } else if (vaeForm) {
      setVaeForm({
        ...vaeForm,
        device_placed_date: pre.device_placed_date,
        device_removed_date: pre.device_removed_date || undefined,
      });
    }
    toast.success("Đã lấy ngày dụng cụ từ lưới bệnh án");
  };

  const ensurePersistedRow = async (): Promise<boolean> => {
    if (!isNkbvBaAnalysisDraftId(row.id)) return true;
    if (!persistDraft) {
      toast.error("Chưa neo được phiếu — thử chọn lại mốc Index");
      return false;
    }
    const persisted = await persistDraft();
    if (!persisted?.id || isNkbvBaAnalysisDraftId(persisted.id)) {
      toast.error("Không neo được phiếu vào hệ thống — kiểm tra quyền / danh mục loại NKBV");
      return false;
    }
    flushSync(() => {
      setRow(persisted);
    });
    return true;
  };

  const onSave = () => {
    if (!clinicalConfirmed) {
      toast.error("Cần tích «Đã đối soát với khoa» trước khi lưu");
      return;
    }
    void (async () => {
      const ok = await ensurePersistedRow();
      if (!ok) return;
      await handleSaveChecklist();
    })();
  };

  const onAdjudicateWrapped = async (decision: "APPROVE" | "EXCLUDE", reason?: string) => {
    if (decision === "APPROVE" && !ksnkConfirmed) {
      toast.error("Cần tích «KSNK thống nhất / chốt ca» trước khi xác nhận");
      return;
    }
    const ok = await ensurePersistedRow();
    if (!ok) return;
    await handleAdjudicate(decision, reason);
  };

  const printPortal =
    typeof document !== "undefined" && suspectedType && suspectedType !== "LOAI_TRU"
      ? createPortal(
          <NkbvCasePrintView
            row={row}
            checklistType={checklistType}
            liveCdcMetrics={liveCdcMetrics}
            liveEvaluation={liveEvaluation}
            symptomDates={symptomDates}
            activeForm={activeForm}
            ngayVaoVien={ngayVaoVienEffective}
            lockStatus={lockStatus}
          />,
          document.body,
        )
      : null;

  return (
    <>
      {printPortal}
      <div className="flex h-full min-h-0 flex-col print:hidden">
        <div className="shrink-0 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-[var(--primary)]" />
              Phiếu phân tích trên bệnh án
            </h3>
            <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--primary)]">
              {formatNkbvChecklistTypeLabel(checklistType)}
            </span>
            {liveCdcMetrics?.iwp_start && liveCdcMetrics?.iwp_end ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
                IWP: {liveCdcMetrics.iwp_start} → {liveCdcMetrics.iwp_end}
              </span>
            ) : null}
          </div>
          {milestoneLabel ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Neo mốc Index: <strong className="text-slate-800">{milestoneLabel}</strong>
            </p>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-[11px] md:grid-cols-3">
            <div>
              <span className="text-slate-400">Mã phiếu</span>
              <p className="font-semibold text-slate-800">{String(row.ma_ca || "—")}</p>
            </div>
            <div>
              <span className="text-slate-400">Ngày Index / lấy mẫu</span>
              <p className="font-semibold text-slate-800">
                {formatDateVi(row.ngay_phat_hien as string)}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Bệnh phẩm</span>
              <p className="font-semibold text-slate-800">{String(row.loai_benh_pham || "—")}</p>
            </div>
          </div>
          {benhAnLoaded && benhAnMissing ? (
            <p className="mt-1 text-[11px] text-amber-700">Chưa liên kết đủ hồ sơ bệnh án</p>
          ) : null}
          {(checklistType === "SSI" ||
            (row as { ma_cycle_qr_lien_quan?: string }).ma_cycle_qr_lien_quan) && (
            <div className="mt-2">
              <NkbvCssdRcaPanel
                maQr={(row as { ma_cycle_qr_lien_quan?: string }).ma_cycle_qr_lien_quan}
                quyTrinhId={(row as { quy_trinh_id?: string }).quy_trinh_id}
                showEmptyHint={checklistType === "SSI"}
              />
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3 pr-1">
          <NkbvSymptomReviewProvider
            review={symptomReview}
            onReviewChange={(key, patch) =>
              setSymptomReview((prev) => patchSymptomReview(prev, key, patch))
            }
          >
          <NkbvDiagnosticCaseForm
            row={row}
            suggestedType={suggestedType}
            suggestedReason={suggestedReason}
            specimenLabel={String(row.loai_benh_pham || "")}
            suspectedType={suspectedType}
            setSuspectedType={setSuspectedType}
            lockType={lockedType}
            checklistType={checklistType}
            clinicalPathway={clinicalPathway || "BSI"}
            allowedEdit={allowedEdit}
            khoas={khoas}
            treatmentHistory={treatmentHistory}
            onAddStay={handleAddStay}
            onDeleteStay={handleDeleteStay}
            symptomDates={symptomDates}
            onSymptomDateChange={handleSymptomDateChange}
            bsiForm={bsiForm}
            setBsiForm={setBsiForm}
            utiForm={utiForm}
            setUtiForm={setUtiForm}
            vaeForm={vaeForm}
            setVaeForm={setVaeForm}
            ssiForm={ssiForm}
            setSsiForm={setSsiForm}
            ch17Form={ch17Form}
            setCh17Form={setCh17Form}
            liveCdcMetrics={liveCdcMetrics}
            liveEvaluation={liveEvaluation}
            onPrefillDevice={() => void handlePrefillDevice()}
            ghiChuTuyBien={ghiChuTuyBien}
            setGhiChuTuyBien={setGhiChuTuyBien}
            clinicalConfirmed={clinicalConfirmed}
            setClinicalConfirmed={setClinicalConfirmed}
            ksnkConfirmed={ksnkConfirmed}
            setKsnkConfirmed={setKsnkConfirmed}
            canConfirmKsnk={canConfirmKsnk}
            ngayVaoVienEffective={ngayVaoVienEffective}
            onAdmissionDateChange={(d) => void handleSyncAdmissionDate(d)}
            benhAnMissing={benhAnMissing}
          />
          </NkbvSymptomReviewProvider>

          {allowedEdit ? (
            <div className="mt-4">
              <NkbvAdjudicationPanel
                onAdjudicate={onAdjudicateWrapped}
                allowedEdit={allowedEdit}
                simulatedRole="KSNK"
                adjudicating={adjudicating}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          {suspectedType && suspectedType !== "LOAI_TRU" ? (
            <button
              type="button"
              onClick={() => window.print()}
              className={`${C.ctaSecondary} inline-flex min-h-10 items-center gap-1.5 px-3 text-xs`}
            >
              <Printer className="h-3.5 w-3.5" />
              In phiếu
            </button>
          ) : null}
          <button
            type="button"
            disabled={submitting || !allowedEdit}
            onClick={onSave}
            className={`${C.ctaPrimary} min-h-10 px-4 text-xs disabled:opacity-50`}
          >
            {submitting ? "Đang lưu…" : "Lưu trên bệnh án"}
          </button>
        </div>
      </div>
    </>
  );
}
