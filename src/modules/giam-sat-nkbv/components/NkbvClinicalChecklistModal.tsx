"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Printer } from "lucide-react";
import NkbvCssdRcaPanel from "@/modules/giam-sat-nkbv/components/NkbvCssdRcaPanel";
import NkbvDiagnosticCaseForm from "@/modules/giam-sat-nkbv/components/NkbvDiagnosticCaseForm";
import NkbvCasePrintView from "@/modules/giam-sat-nkbv/components/NkbvCasePrintView";
import NkbvAdjudicationPanel from "@/modules/giam-sat-nkbv/components/NkbvAdjudicationPanel";
import { getDevicePrefillForStay } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-device-registry.actions";
import { getNkbvBenhAnHub } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv-read.actions";
import { syncFormSymptomToBaTimeline } from "@/modules/giam-sat-nkbv/actions/giam-sat-nkbv.actions";
import type { DeviceRegistryType } from "@/modules/giam-sat-nkbv/lib/nkbv-shared-device-days";
import type { BaTimelineMilestone } from "@/modules/giam-sat-nkbv/lib/nkbv-ba-timeline-core";
import {
  SYMPTOM_DATE_TO_TIMELINE,
  prefillSymptomDatesFromTimeline,
} from "@/modules/giam-sat-nkbv/lib/nkbv-symptom-timeline-bridge";
import { toast } from "sonner";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { useNkbvChecklistModalState } from "./useNkbvChecklistModalState";
import { formatNkbvChecklistTypeLabel } from "../lib/nkbv-loai-labels";
import { formatDateVi } from "@/lib/format-datetime-vi";

export type NkbvClinicalChecklistModalProps = {
  row: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
  allowedEdit: boolean;
  khoas?: Array<{ id: string; ten_danh_muc: string }>;
};

function LisReadonlyBanner({ row }: { row: Record<string, any> }) {
  const notes = row.clinical_notes && typeof row.clinical_notes === "object" ? row.clinical_notes : {};
  const maXn = String((notes as { ma_xet_nghiem?: string }).ma_xet_nghiem || row.ma_benh_pham || "—");
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 text-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Kết quả vi sinh đã import
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
        <div>
          <span className="block text-xs text-slate-400">Mã xét nghiệm</span>
          <strong className="font-mono text-slate-800">{maXn}</strong>
        </div>
        <div>
          <span className="block text-xs text-slate-400">Bệnh phẩm</span>
          <strong className="text-slate-800">{String(row.loai_benh_pham || "—")}</strong>
        </div>
        <div>
          <span className="block text-xs text-slate-400">Tác nhân</span>
          <strong className="font-mono italic text-amber-800">
            {String(row.tac_nhan_vi_khuan || "—")}
          </strong>
        </div>
        <div>
          <span className="block text-xs text-slate-400">Định lượng / CFU</span>
          <strong className="font-mono text-slate-800">{String(row.so_luong || "—")}</strong>
        </div>
      </div>
    </div>
  );
}

export default function NkbvClinicalChecklistModal({
  row,
  onClose,
  onSuccess,
  allowedEdit,
  khoas = [],
}: NkbvClinicalChecklistModalProps) {
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
    handleAddStay,
    handleDeleteStay,
    liveCdcMetrics,
    liveEvaluation,
    handleSaveChecklist,
    handleAdjudicate,
    ngayVaoVienEffective,
    ngaySinhEffective,
    handleSyncAdmissionDate,
    benhAnLoaded,
    benhAnMissing,
  } = useNkbvChecklistModalState({ row, onClose, onSuccess, allowedEdit });

  const [clinicalConfirmed, setClinicalConfirmed] = useState(false);
  const [ksnkConfirmed, setKsnkConfirmed] = useState(false);
  const [timelineMilestones, setTimelineMilestones] = useState<BaTimelineMilestone[]>([]);
  /** KSNK được tick khi user có quyền sửa (pilot: mọi allowedEdit; UI vẫn tách vai trò). */
  const canConfirmKsnk = allowedEdit;

  useEffect(() => {
    const ma = String(row.ma_benh_an || "").trim();
    if (!ma) {
      setTimelineMilestones([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await getNkbvBenhAnHub(ma);
      if (cancelled) return;
      if (res.success && Array.isArray(res.data?.timeline)) {
        setTimelineMilestones(res.data.timeline as BaTimelineMilestone[]);
      } else {
        setTimelineMilestones([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row.ma_benh_an, row.id]);

  const timelinePrefillRef = useRef("");
  useEffect(() => {
    const caseId = String(row.id || "");
    if (!caseId || !timelineMilestones.length) return;
    const stamp = `${caseId}:${liveCdcMetrics?.iwp_start || ""}:${liveCdcMetrics?.iwp_end || ""}:${timelineMilestones.length}`;
    if (timelinePrefillRef.current === stamp) return;
    timelinePrefillRef.current = stamp;
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

  const handleSymptomDateChange = (key: string, date: string) => {
    setSymptomDates((prev) => ({ ...prev, [key]: date }));
    const meta = SYMPTOM_DATE_TO_TIMELINE[key];
    const maBa = String(row.ma_benh_an || "");
    if (!meta || !maBa || !allowedEdit) return;
    void (async () => {
      const res = await syncFormSymptomToBaTimeline({
        ma_benh_an: maBa,
        criteria_key: meta.criteriaKey,
        milestone_kind: meta.milestoneKind,
        title: meta.title,
        milestone_date: date || null,
        form_field_key: key,
      });
      if (!res.success) {
        toast.error(res.error || "Không đồng bộ timeline BA");
        return;
      }
      // Làm mới mốc để lần mở sau khớp lưới
      const hub = await getNkbvBenhAnHub(maBa);
      if (hub.success && Array.isArray(hub.data?.timeline)) {
        setTimelineMilestones(hub.data.timeline as BaTimelineMilestone[]);
      }
    })();
  };

  const activeForm = useMemo(() => {
    if (checklistType === "BSI") return bsiForm as Record<string, unknown> | null;
    if (checklistType === "UTI") return utiForm as Record<string, unknown> | null;
    if (checklistType === "SSI") return ssiForm as Record<string, unknown> | null;
    if (checklistType === "CH17") return ch17Form as Record<string, unknown> | null;
    return vaeForm as Record<string, unknown> | null;
  }, [checklistType, bsiForm, utiForm, ssiForm, ch17Form, vaeForm]);

  const lockStatus: "DRAFT" | "DA_CHOT" = useMemo(() => {
    const ma = String(row.trang_thai_ma || "").toUpperCase();
    const ten = String(row.trang_thai_ten || "").toLowerCase();
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
  }, [row.trang_thai_ma, row.trang_thai_ten]);

  const handlePrintCase = () => {
    window.print();
  };

  const prefillKeyRef = useRef<string>("");
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
    const key = `${row.ma_benh_an}:${checklistType}:${want}`;
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
  }, [allowedEdit, checklistType, clinicalPathway, row.ma_benh_an, setBsiForm, setUtiForm, setVaeForm]);

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
      toast.error("Chưa có dụng cụ phù hợp trên sổ đăng ký");
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
    toast.success("Đã lấy ngày dụng cụ từ sổ đăng ký");
  };

  const onSave = () => {
    if (!clinicalConfirmed) {
      toast.error("Cần tích «Lâm sàng xác nhận» trước khi lưu");
      return;
    }
    void handleSaveChecklist();
  };

  const onAdjudicateWrapped = async (decision: "APPROVE" | "EXCLUDE", reason?: string) => {
    if (decision === "APPROVE" && !ksnkConfirmed) {
      toast.error("Cần tích «KSNK xác nhận chốt ca» trước khi xác nhận");
      return;
    }
    await handleAdjudicate(decision, reason);
  };

  const printPortal =
    typeof document !== "undefined" &&
    suspectedType &&
    suspectedType !== "LOAI_TRU"
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
      {createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:p-4 print:hidden">
      <div className="relative my-4 flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-2xl sm:my-6 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2.5 text-slate-400 transition hover:bg-slate-50"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="shrink-0 border-b border-slate-100 pb-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`${C.modalTitle} flex items-center gap-2`}>
              <FileText className="h-6 w-6 text-[var(--primary)]" />
              Xác định ca NKBV
            </h2>
            <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1.5 font-mono text-xs font-medium text-[var(--primary)]">
              {formatNkbvChecklistTypeLabel(checklistType)}
            </span>
            {liveCdcMetrics?.iwp_start && liveCdcMetrics?.iwp_end ? (
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
                {liveCdcMetrics.uses_clinical_iwp === false && checklistType === "VAE"
                  ? "Event Period"
                  : "IWP"}
                : {liveCdcMetrics.iwp_start} → {liveCdcMetrics.iwp_end}
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm md:grid-cols-4">
            <div>
              <span className="block text-xs text-slate-400">Mã ca / Mã BA</span>
              <strong className="text-slate-800">{String(row.ma_ca || "")}</strong>
              <span className="text-slate-500"> / {String(row.ma_benh_an || "—")}</span>
              {benhAnLoaded ? (
                <p className={`mt-0.5 text-[11px] font-medium ${benhAnMissing ? "text-amber-700" : "text-emerald-700"}`}>
                  {benhAnMissing
                    ? "Chưa liên kết hồ sơ bệnh án"
                    : "Đã liên kết hồ sơ bệnh án"}
                </p>
              ) : null}
            </div>
            <div>
              <span className="block text-xs text-slate-400">Họ tên</span>
              <strong className="text-slate-800">{String(row.ho_ten_benh_nhan || "—")}</strong>
            </div>
            <div>
              <span className="block text-xs text-slate-400">Ngày lấy mẫu</span>
              <strong className="text-slate-800">
                {formatDateVi(row.ngay_phat_hien)}
              </strong>
            </div>
            <div>
              <span className="block text-xs text-slate-400">PID</span>
              <strong className="font-mono text-slate-700">{String(row.ma_benh_nhan || "—")}</strong>
            </div>
            <div className="col-span-2 md:col-span-4">
              <span className="block text-xs text-slate-400">Ngày vào viện (hồ sơ bệnh án → POA/HAI)</span>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={ngayVaoVienEffective || ""}
                  disabled={!allowedEdit}
                  onChange={(e) => void handleSyncAdmissionDate(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                />
                {!ngayVaoVienEffective ? (
                  <span className="text-[11px] text-amber-700">Thiếu ngày — POA/HAI chưa chính xác</span>
                ) : (
                  <span className="text-[11px] text-slate-500">Đổi ngày sẽ đồng bộ BA và tính lại HAI/POA</span>
                )}
              </div>
            </div>
          </div>

          <LisReadonlyBanner row={row} />

          {(() => {
            const notes =
              row.clinical_notes && typeof row.clinical_notes === "object" ? row.clinical_notes : {};
            const alerts = Array.isArray((notes as { import_alerts?: unknown }).import_alerts)
              ? (notes as { import_alerts: Array<{ code?: string; message?: string }> }).import_alerts
              : [];
            if (!alerts.length && !(notes as { can_phan_tich_sbap?: boolean }).can_phan_tich_sbap) {
              return null;
            }
            return (
              <div className="mt-3 space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
                <p className="font-bold text-amber-900">Cảnh báo khung thời gian</p>
                <ul className="list-disc space-y-1 pl-4 text-xs">
                  {alerts.map((a, i) => (
                    <li key={`${a.code}-${i}`}>
                      <span className="font-semibold">{a.code || "ALERT"}:</span> {a.message || ""}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {checklistType === "SSI" ||
          (row as { ma_cycle_qr_lien_quan?: string }).ma_cycle_qr_lien_quan ||
          (row as { quy_trinh_id?: string }).quy_trinh_id ? (
            <div className="mt-3">
              <NkbvCssdRcaPanel
                maQr={(row as { ma_cycle_qr_lien_quan?: string }).ma_cycle_qr_lien_quan}
                quyTrinhId={(row as { quy_trinh_id?: string }).quy_trinh_id}
                showEmptyHint={checklistType === "SSI"}
              />
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-5 pr-1">
          <NkbvDiagnosticCaseForm
            row={row}
            suggestedType={suggestedType}
            suggestedReason={suggestedReason}
            specimenLabel={String(row.loai_benh_pham || "")}
            suspectedType={suspectedType}
            setSuspectedType={setSuspectedType}
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
            ngaySinhEffective={ngaySinhEffective}
          />

          {allowedEdit ? (
            <div className="mt-5">
              <NkbvAdjudicationPanel
                onAdjudicate={onAdjudicateWrapped}
                allowedEdit={allowedEdit}
                simulatedRole="KSNK"
                adjudicating={adjudicating}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-slate-400">
            Index → cửa sổ → tiêu chuẩn → DOE → POA/HAI → LOA → dụng cụ → RIT → SBAP → xác nhận.
          </span>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onClose} className={`${C.ctaSecondary} min-h-11`}>
              Đóng
            </button>
            {suspectedType && suspectedType !== "LOAI_TRU" ? (
              <button
                type="button"
                onClick={handlePrintCase}
                className={`${C.ctaSecondary} min-h-11 inline-flex items-center gap-2`}
              >
                <Printer className="h-4 w-4" />
                In phiếu ({lockStatus === "DA_CHOT" ? "đã chốt" : "nháp"})
              </button>
            ) : null}
            <button
              type="button"
              disabled={submitting || !allowedEdit}
              onClick={onSave}
              className={`${C.ctaPrimary} min-h-11 disabled:opacity-50`}
            >
              {submitting ? "Đang lưu…" : "Lưu nháp / gửi"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
      )}
    </>
  );
}
