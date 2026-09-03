"use client";

import React from "react";
import { Ban, CheckCircle } from "lucide-react";
import BsiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/BsiClinicalSubForm";
import UtiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/UtiClinicalSubForm";
import PneuClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/PneuClinicalSubForm";
import VaeClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/VaeClinicalSubForm";
import SsiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/SsiClinicalSubForm";
import Ch17ClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/Ch17ClinicalSubForm";
import NkbvStayHistoryTable from "@/modules/giam-sat-nkbv/components/NkbvStayHistoryTable";
import NkbvDiagnosticRow from "@/modules/giam-sat-nkbv/components/NkbvDiagnosticRow";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { addDays } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import type { CdcMetricsResult } from "@/modules/giam-sat-nkbv/lib/nkbv-timeline-math";
import type { RuleEvaluationResult } from "@/modules/giam-sat-nkbv/lib/nkbv-rules-engine";
import type {
  BsiVerificationData,
  Ch17VerificationData,
  DepartmentStay,
  SsiVerificationData,
  UtiVerificationData,
  VaeVerificationData,
} from "@/modules/giam-sat-nkbv/types/nkbv-verification";
import {
  formatNkbvChecklistTypeLabel,
  NKBV_CHECKLIST_TYPE_PICKER_LABELS,
  type NkbvChecklistTypeCode,
} from "../lib/nkbv-loai-labels";
import { formatKhoaCompactLabel } from "@/lib/domain/khoa-display";
import type { NkbvActiveChecklistType, NkbvSuspectedType } from "./useNkbvChecklistModalState";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const p = d.slice(0, 10).split("-");
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return d;
}

function windowKindLabel(checklistType: NkbvActiveChecklistType) {
  if (checklistType === "VAE") return "Event Period";
  if (checklistType === "SSI") return "Cửa sổ theo dõi sau mổ";
  if (checklistType === "CH17") return "IWP Ch.17 (±3; ENDO ±10)";
  return "IWP (cửa sổ nhiễm khuẩn ±3 ngày)";
}

function indexFactorLabel(checklistType: NkbvActiveChecklistType) {
  switch (checklistType) {
    case "UTI":
      return "Cấy nước tiểu dương tính đạt ngưỡng";
    case "BSI":
      return "Cấy máu dương tính";
    case "VAE":
      return "Xấu đi PEEP / FiO₂ trên máy thở";
    case "VAP":
    case "HAP":
      return "Cấy đờm/BAL hoặc X-quang/CT bất thường";
    case "SSI":
      return "Theo dõi sau phẫu thuật (30/90 ngày)";
    case "CH17":
      return "Bằng chứng cấu thành tiêu chuẩn site (Chương 17)";
    default:
      return "Yếu tố dương tính đầu dùng cho tiêu chuẩn";
  }
}

function deviceLabel(checklistType: NkbvActiveChecklistType) {
  if (checklistType === "BSI") return "Catheter tĩnh mạch trung tâm (CVC)";
  if (checklistType === "UTI") return "Ống thông tiểu (Foley)";
  if (checklistType === "VAE" || checklistType === "VAP" || checklistType === "HAP") {
    return "Máy thở xâm lấn";
  }
  return "Dụng cụ xâm lấn";
}

export type NkbvDiagnosticCaseFormProps = {
  row: Record<string, unknown>;
  suggestedType: NkbvSuspectedType;
  suggestedReason: string;
  specimenLabel?: string;
  suspectedType: NkbvSuspectedType | null;
  setSuspectedType: (t: NkbvChecklistTypeCode) => void;
  /** Phiếu đã gắn loại (lưới) — ẩn chọn loại. */
  lockType?: NkbvChecklistTypeCode | null;
  checklistType: NkbvActiveChecklistType;
  clinicalPathway: "BSI" | "UTI" | "VAE" | "PNEU" | "SSI" | "CH17";
  allowedEdit: boolean;
  khoas: Array<{ id: string; ten_danh_muc: string }>;
  treatmentHistory: DepartmentStay[];
  onAddStay: (stay: DepartmentStay) => void;
  onDeleteStay: (idx: number) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  bsiForm: BsiVerificationData | null;
  setBsiForm: (v: BsiVerificationData) => void;
  utiForm: UtiVerificationData | null;
  setUtiForm: (v: UtiVerificationData) => void;
  vaeForm: VaeVerificationData | null;
  setVaeForm: (v: VaeVerificationData) => void;
  ssiForm: SsiVerificationData | null;
  setSsiForm: (v: SsiVerificationData) => void;
  ch17Form: Ch17VerificationData | null;
  setCh17Form: (v: Ch17VerificationData) => void;
  liveCdcMetrics: CdcMetricsResult | null;
  liveEvaluation: RuleEvaluationResult;
  onPrefillDevice: () => void;
  ghiChuTuyBien: string;
  setGhiChuTuyBien: (v: string) => void;
  clinicalConfirmed: boolean;
  setClinicalConfirmed: (v: boolean) => void;
  ksnkConfirmed: boolean;
  setKsnkConfirmed: (v: boolean) => void;
  canConfirmKsnk: boolean;
  /** Ngày vào viện hiệu lực (ưu tiên hồ sơ BA) — dùng POA/HAI + form. */
  ngayVaoVienEffective?: string;
  onAdmissionDateChange?: (date: string) => void;
  benhAnMissing?: boolean;
  /** Ngày sinh — ẩn nhánh nhi khi thiếu / người lớn. */
  ngaySinhEffective?: string | null;
};

export default function NkbvDiagnosticCaseForm({
  row,
  suggestedType,
  suggestedReason,
  specimenLabel = "",
  suspectedType,
  setSuspectedType,
  lockType = null,
  checklistType,
  clinicalPathway,
  allowedEdit,
  khoas,
  treatmentHistory,
  onAddStay,
  onDeleteStay,
  symptomDates,
  onSymptomDateChange,
  bsiForm,
  setBsiForm,
  utiForm,
  setUtiForm,
  vaeForm,
  setVaeForm,
  ssiForm,
  setSsiForm,
  ch17Form,
  setCh17Form,
  liveCdcMetrics,
  liveEvaluation,
  onPrefillDevice,
  ghiChuTuyBien,
  setGhiChuTuyBien,
  clinicalConfirmed,
  setClinicalConfirmed,
  ksnkConfirmed,
  setKsnkConfirmed,
  canConfirmKsnk,
  ngayVaoVienEffective,
  onAdmissionDateChange,
  benhAnMissing = false,
  ngaySinhEffective = null,
}: NkbvDiagnosticCaseFormProps) {
  const ngayVaoVien =
    String(ngayVaoVienEffective || row.ngay_vao_vien || "").slice(0, 10);
  const ngayRaVienCase =
    String((row as { ngay_ra_vien?: string | null }).ngay_ra_vien || "").slice(
      0,
      10,
    ) || null;
  const ngaySinh =
    (ngaySinhEffective && String(ngaySinhEffective).slice(0, 10)) ||
    (row.ngay_sinh ? String(row.ngay_sinh).slice(0, 10) : null) ||
    null;
  const clinicalFormProps = {
    symptomDates,
    onSymptomDateChange,
    allowedEdit,
    ngayVaoVien,
    ngayPhatHien: String(row.ngay_phat_hien || ""),
    ngaySinh,
    iwpStart: liveCdcMetrics?.iwp_start,
    iwpEnd: liveCdcMetrics?.iwp_end,
    activeTab: "LAM_SANG" as const,
    embedded: true,
  };

  const doe = liveCdcMetrics?.doe;
  const ritEnd = doe ? addDays(doe.slice(0, 10), 13) : "";
  const showSecondaryEditors = checklistType === "BSI" || checklistType === "UTI" || checklistType === "SSI";

  const vd =
    row.verification_data && typeof row.verification_data === "object"
      ? (row.verification_data as Record<string, unknown>)
      : {};
  const baRitLabs = Array.isArray(vd.ba_rit_labs)
    ? (vd.ba_rit_labs as Array<{
        id?: string;
        ngay?: string;
        benh_pham?: string;
        vi_khuan?: string | null;
        is_index?: boolean;
      }>)
    : [];
  const baSbapLabs = Array.isArray(vd.ba_sbap_labs)
    ? (vd.ba_sbap_labs as Array<{
        id?: string;
        ngay?: string;
        vi_khuan?: string | null;
      }>)
    : [];
  const seededIwp =
    vd.calculated_iwp_start && vd.calculated_iwp_end
      ? `${fmtDate(String(vd.calculated_iwp_start))} → ${fmtDate(String(vd.calculated_iwp_end))}`
      : null;
  const seededSbap =
    vd.calculated_sbap_start && vd.calculated_sbap_end
      ? `${fmtDate(String(vd.calculated_sbap_start))} → ${fmtDate(String(vd.calculated_sbap_end))}`
      : null;

  if (suspectedType === "LOAI_TRU") {
    return (
      <div className="space-y-[var(--bv103-space-3)]">
        <TypePicker
          suggestedType={suggestedType}
          suggestedReason={suggestedReason}
          specimenLabel={specimenLabel}
          suspectedType={suspectedType}
          setSuspectedType={setSuspectedType}
          allowedEdit={allowedEdit}
          lockType={lockType}
        />
        <div className="space-y-3 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50 p-8 text-center">
          <Ban className="mx-auto h-10 w-10 text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-700">
            Đã chọn loại trừ — ghi rõ lý do ở phần xác nhận bên dưới rồi lưu
          </h4>
        </div>
        <ConfirmBlock
          ghiChuTuyBien={ghiChuTuyBien}
          setGhiChuTuyBien={setGhiChuTuyBien}
          clinicalConfirmed={clinicalConfirmed}
          setClinicalConfirmed={setClinicalConfirmed}
          ksnkConfirmed={ksnkConfirmed}
          setKsnkConfirmed={setKsnkConfirmed}
          canConfirmKsnk={canConfirmKsnk}
          allowedEdit={allowedEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <TypePicker
        suggestedType={suggestedType}
        suggestedReason={suggestedReason}
        specimenLabel={specimenLabel}
        suspectedType={suspectedType}
        setSuspectedType={setSuspectedType}
        allowedEdit={allowedEdit}
        lockType={lockType}
      />

      {/* 0 Index */}
      <NkbvDiagnosticRow
        step={0}
        title="Yếu tố xác định khung"
        hint="Ngày dương tính đầu dùng cho tiêu chuẩn → mở cửa sổ thời gian."
        tone="sky"
        milestone={
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">{indexFactorLabel(checklistType)}</span>
            <br />
            <span className="text-slate-500">
              Ngày lấy mẫu: {fmtDate(String(row.ngay_phat_hien || ""))}
            </span>
          </p>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Bệnh phẩm: <strong>{String(row.loai_benh_pham || "—")}</strong>
            {" · "}
            Tác nhân:{" "}
            <strong className="font-mono text-amber-900">
              {String(row.tac_nhan_vi_khuan || "—")}
            </strong>
          </p>
          {(checklistType === "VAP" || checklistType === "HAP") && vaeForm ? (
            <div className="flex flex-wrap gap-[var(--bv103-space-3)] text-sm font-semibold">
              <label className="inline-flex min-h-11 items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pneu_trigger_diag"
                  checked={(vaeForm.pneu_trigger || "CULTURE") === "CULTURE"}
                  disabled={!allowedEdit}
                  onChange={() => setVaeForm({ ...vaeForm, pneu_trigger: "CULTURE" })}
                  className="h-4 w-4"
                />
                Cấy đờm / BAL (ngày mẫu vi sinh)
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="pneu_trigger_diag"
                  checked={vaeForm.pneu_trigger === "IMAGING"}
                  disabled={!allowedEdit}
                  onChange={() => setVaeForm({ ...vaeForm, pneu_trigger: "IMAGING" })}
                  className="h-4 w-4"
                />
                X-quang / CT (ngày phim bất thường)
              </label>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {lockType && lockType !== "LOAI_TRU"
                ? "Loại phiếu khớp nhóm phân tích trên lưới bệnh án."
                : "Gợi ý loại theo bệnh phẩm — có thể đổi ở khung chọn loại phía trên."}
            </p>
          )}
        </div>
      </NkbvDiagnosticRow>

      {/* 1 Window */}
      <NkbvDiagnosticRow
        step={1}
        title="Cửa sổ thời gian"
        hint="Mọi tiêu chí dương tính phải thuộc cửa sổ này."
        tone="sky"
        milestone={
          <p className="font-mono text-sm font-semibold text-sky-900">
            {liveCdcMetrics?.iwp_start && liveCdcMetrics?.iwp_end
              ? `${fmtDate(liveCdcMetrics.iwp_start)} → ${fmtDate(liveCdcMetrics.iwp_end)}`
              : seededIwp ||
                "Chưa tính được — bổ sung ngày Index / triệu chứng"}
          </p>
        }
      >
        <p className="text-sm text-slate-700">
          Loại cửa sổ: <strong>{windowKindLabel(checklistType)}</strong>
          {liveCdcMetrics?.uses_clinical_iwp === false ? (
            <span className="mt-1 block text-xs text-slate-500">
              Không dùng IWP ±3 ngày (VAE / một số hội chứng đặc biệt).
            </span>
          ) : checklistType === "CH17" &&
            String((ch17Form as { ch17_type_code?: string } | null)?.ch17_type_code || "").toUpperCase() ===
              "ENDO" ? (
            <span className="mt-1 block text-xs text-slate-500">
              ENDO: IWP = ngày Index ± 10 ngày (21 ngày lịch).
            </span>
          ) : (
            <span className="mt-1 block text-xs text-slate-500">
              IWP = ngày Index ± 3 ngày (7 ngày cố định)
              {checklistType === "CH17" ? " · Chương 17" : ""}.
            </span>
          )}
        </p>
      </NkbvDiagnosticRow>

      {/* 2 Criteria */}
      <NkbvDiagnosticRow
        step={2}
        title="Tiêu chuẩn trong cửa sổ"
        hint="Tick triệu chứng / cận lâm sàng và gắn ngày đầu xuất hiện ∈ cửa sổ."
        tone="emerald"
      >
        <div className="space-y-[var(--bv103-space-3)] [&_label]:min-h-10 [&_input[type=date]]:min-h-11 [&_input[type=date]]:text-sm [&_select]:min-h-11 [&_select]:text-sm">
          {checklistType === "BSI" && bsiForm ? (
            <BsiClinicalSubForm
              form={bsiForm}
              onChange={setBsiForm}
              liveDeviceDays={liveCdcMetrics?.device_placed_days}
              liveDeviceActive={liveCdcMetrics?.device_active_on_event}
              omitSections={["device", "secondary"]}
              {...clinicalFormProps}
            />
          ) : null}
          {clinicalPathway === "VAE" && vaeForm ? (
            <VaeClinicalSubForm
              form={vaeForm}
              onChange={setVaeForm}
              liveDeviceDays={liveCdcMetrics?.device_placed_days}
              {...clinicalFormProps}
            />
          ) : null}
          {clinicalPathway === "PNEU" && vaeForm ? (
            <PneuClinicalSubForm form={vaeForm} onChange={setVaeForm} {...clinicalFormProps} />
          ) : null}
          {checklistType === "UTI" && utiForm ? (
            <UtiClinicalSubForm
              form={utiForm}
              onChange={setUtiForm}
              liveDeviceDays={liveCdcMetrics?.device_placed_days}
              liveDeviceActive={liveCdcMetrics?.device_active_on_event}
              omitSections={["device", "secondary"]}
              {...clinicalFormProps}
            />
          ) : null}
          {checklistType === "SSI" && ssiForm ? (
            <SsiClinicalSubForm form={ssiForm} onChange={setSsiForm} {...clinicalFormProps} />
          ) : null}
          {checklistType === "CH17" && ch17Form ? (
            <Ch17ClinicalSubForm
              form={ch17Form}
              onChange={setCh17Form}
              allowedEdit={allowedEdit}
              ngaySinh={ngaySinh}
              ngayPhatHien={String(row.ngay_phat_hien || "")}
            />
          ) : null}
        </div>
      </NkbvDiagnosticRow>

      {/* 3 DOE */}
      <NkbvDiagnosticRow
        step={3}
        title="Ngày sự kiện (DOE)"
        hint="Ngày sớm nhất xuất hiện yếu tố cấu thành tiêu chuẩn trong cửa sổ."
        milestone={
          <p className="font-mono bv103-type-section text-slate-900">{fmtDate(doe)}</p>
        }
      >
        <p className="text-sm text-slate-600">
          Tự tính từ các ngày triệu chứng / lab trong cửa sổ. Không nhất thiết bằng ngày Index.
        </p>
      </NkbvDiagnosticRow>

      {/* 4 POA/HAI */}
      <NkbvDiagnosticRow
        step={4}
        title="POA / HAI"
        hint="So ngày sự kiện với ngày vào viện (HD1–2 = POA; từ HD3 = HAI)."
        milestone={
          <p className="bv103-type-section">
            {liveCdcMetrics?.haiStatus || "—"}
            {liveCdcMetrics?.dayOfHospitalization != null ? (
              <span className="ml-2 text-sm font-medium text-slate-500">
                · Ngày nằm viện #{liveCdcMetrics.dayOfHospitalization}
              </span>
            ) : null}
          </p>
        }
      >
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-2">
            <span>Ngày vào viện:</span>
            {allowedEdit && onAdmissionDateChange ? (
              <input
                type="date"
                value={ngayVaoVien}
                onChange={(e) => onAdmissionDateChange(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs font-semibold"
              />
            ) : (
              <span className="font-mono font-semibold text-slate-800">{fmtDate(ngayVaoVien)}</span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Nguồn: hồ sơ bệnh án ({String(row.ma_benh_an || "—")})
            {benhAnMissing ? " — chưa tìm thấy BA, đang dùng ngày trên ca" : ""}.
            Đổi ngày sẽ đồng bộ BA và tính lại POA/HAI.
          </p>
        </div>
      </NkbvDiagnosticRow>

      {/* 5 LOA */}
      <NkbvDiagnosticRow
        step={5}
        title="LOA — Quy kết khoa / khu vực"
        hint="Transfer Rule: nếu DOE trùng ngày chuyển khoa hoặc ngày sau → quy kết khoa chuyển đi."
        tone="amber"
        milestone={
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-amber-950">
              {liveCdcMetrics?.attributedStay
                ? formatKhoaCompactLabel(liveCdcMetrics.attributedStay)
                : "Chưa quy kết được khoa"}
            </p>
            {liveCdcMetrics?.attributionReason ? (
              <p className="text-xs leading-relaxed text-amber-900/80">
                {liveCdcMetrics.attributionReason}
              </p>
            ) : null}
          </div>
        }
      >
        <div className={C.sectionGap}>
          <p className="text-sm text-slate-600">
            Lịch chuyển khoa lấy từ lưới bệnh án (cột Khoa). Sửa trên lưới — phiếu theo.
          </p>
          <NkbvStayHistoryTable
            treatmentHistory={treatmentHistory}
            onAddStay={onAddStay}
            onDeleteStay={onDeleteStay}
            khoas={khoas}
            allowedEdit={false}
            ngayVaoVien={ngayVaoVien}
            ngayPhatHien={String(row.ngay_phat_hien || "")}
          />
        </div>
      </NkbvDiagnosticRow>

      {/* 6 Device */}
      <NkbvDiagnosticRow
        step={6}
        title="Dụng cụ xâm lấn"
        hint="Gắn dụng cụ khi đặt liên tục ≥3 ngày lịch (Day 1 = ngày đặt → đủ từ Day 3) và hiện diện DOE hoặc rút đúng DOE−1. Gap ≥1 ngày lịch trống → đếm lại từ đầu."
        tone="emerald"
        milestone={
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{deviceLabel(checklistType)}</p>
            {checklistType === "VAP" || checklistType === "HAP" ? (
              <p>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 bv103-type-label font-semibold ${
                    checklistType === "VAP"
                      ? "bg-fuchsia-100 text-fuchsia-900"
                      : "bg-sky-100 text-sky-900"
                  }`}
                >
                  {checklistType === "VAP" ? "VAP" : "Non-VAP (HAP)"}
                </span>
              </p>
            ) : null}
            <p>
              {liveCdcMetrics
                ? `${liveCdcMetrics.device_placed_days} ngày · ${
                    liveCdcMetrics.device_active_on_event
                      ? "Hiện diện DOE/DOE−1 — có thể gắn"
                      : "Không hiện diện ngày sự kiện"
                  }`
                : "Chưa đủ ngày đặt dụng cụ"}
            </p>
          </div>
        }
      >
        <div className={C.sectionGap}>
          {(checklistType === "BSI" ||
            checklistType === "UTI" ||
            checklistType === "VAE" ||
            checklistType === "VAP" ||
            checklistType === "HAP") && (
            <DeviceDateEditors
              checklistType={checklistType}
              allowedEdit={false}
              bsiForm={bsiForm}
              setBsiForm={setBsiForm}
              utiForm={utiForm}
              setUtiForm={setUtiForm}
              vaeForm={vaeForm}
              setVaeForm={setVaeForm}
              ngayVaoVien={ngayVaoVien}
              ngayPhatHien={String(row.ngay_phat_hien || "").slice(0, 10)}
            />
          )}
          <p className="text-[11px] text-slate-500">
            Khoa và Foley/máy/CVC lấy từ lưới bệnh án. Sửa trên lưới — không nhập lại trên phiếu.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={`${C.ctaSecondary} min-h-11`} onClick={onPrefillDevice}>
              Lấy ngày dụng cụ từ lưới bệnh án
            </button>
          </div>
        </div>
      </NkbvDiagnosticRow>

      {/* 7 RIT */}
      <NkbvDiagnosticRow
        step={7}
        title="RIT — Khung nhiễm trùng lặp lại"
        hint="14 ngày kể từ DOE (DOE = ngày 1). Không báo cáo ca mới cùng major type trong RIT."
        milestone={
          <p className="font-mono text-sm font-semibold">
            {doe
              ? `${fmtDate(doe)} → ${fmtDate(
                  String(vd.calculated_rit_end || ritEnd).slice(0, 10),
                )}`
              : "—"}
          </p>
        }
      >
        <p className="text-sm text-slate-600">
          Tác nhân mới trong RIT được bổ sung vào ca gốc, không tạo ca mới cùng loại chính.
        </p>
        {baRitLabs.length > 0 ? (
          <ul className="mt-2 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2 py-1.5 text-[11px] text-emerald-950">
            <li className="font-medium text-emerald-800">
              Lab ∈ RIT (seed từ bảng BA)
            </li>
            {baRitLabs.map((l, i) => (
              <li key={String(l.id || i)}>
                {fmtDate(l.ngay)}
                {l.is_index ? " · Index" : ""} · {l.benh_pham || "XN"} ·{" "}
                {l.vi_khuan || "—"}
              </li>
            ))}
          </ul>
        ) : null}
      </NkbvDiagnosticRow>

      {/* 8 Secondary BSI / SBAP */}
      <NkbvDiagnosticRow
        step={8}
        title="Secondary BSI — cửa sổ SBAP"
        hint="Máu trong SBAP + khớp tác nhân với ổ nguyên phát → Secondary (không gán CLABSI trùng)."
        tone="rose"
        milestone={
          <div className="space-y-1 text-sm">
            <p className="font-mono font-semibold">
              {liveCdcMetrics?.sbap_start && liveCdcMetrics?.sbap_end
                ? `${fmtDate(liveCdcMetrics.sbap_start)} → ${fmtDate(liveCdcMetrics.sbap_end)}`
                : seededSbap || "—"}
            </p>
            <p className="font-bold">
              {liveEvaluation.is_secondary_bsi ? "Secondary BSI = CÓ" : "Secondary BSI = Không"}
            </p>
          </div>
        }
      >
        {baSbapLabs.length > 0 ? (
          <ul className="mb-2 space-y-1 rounded-lg border border-sky-200 bg-sky-50/70 px-2 py-1.5 text-[11px] text-sky-950">
            <li className="font-medium text-sky-800">
              Cấy máu ∈ SBAP (seed từ bảng BA)
            </li>
            {baSbapLabs.map((l, i) => (
              <li key={String(l.id || i)}>
                {fmtDate(l.ngay)} · Máu · {l.vi_khuan || "—"}
              </li>
            ))}
          </ul>
        ) : null}
        {showSecondaryEditors ? (
          <SecondaryEditors
            checklistType={checklistType}
            allowedEdit={allowedEdit}
            bsiForm={bsiForm}
            setBsiForm={setBsiForm}
            utiForm={utiForm}
            setUtiForm={setUtiForm}
            ssiForm={ssiForm}
            setSsiForm={setSsiForm}
            symptomDates={symptomDates}
            onSymptomDateChange={onSymptomDateChange}
            iwpStart={
              liveCdcMetrics?.iwp_start || (vd.calculated_iwp_start as string | undefined)
            }
            iwpEnd={liveCdcMetrics?.iwp_end || (vd.calculated_iwp_end as string | undefined)}
            sbapStart={
              liveCdcMetrics?.sbap_start || (vd.calculated_sbap_start as string | undefined)
            }
            sbapEnd={
              liveCdcMetrics?.sbap_end || (vd.calculated_sbap_end as string | undefined)
            }
          />
        ) : (
          <p className="text-sm text-slate-600">
            Với VAE: Secondary chỉ xét khi đạt PVAP (cấy máu trong Event Period). PedVAE cấm
            Secondary BSI.
          </p>
        )}
      </NkbvDiagnosticRow>

      {/* 9 Conclusion */}
      <NkbvDiagnosticRow
        step={9}
        title="Kết luận tiêu chuẩn"
        hint="Đề xuất từ engine — chưa phải xác nhận cuối cùng."
        tone={liveEvaluation.is_positive ? "emerald" : "default"}
        milestone={
          <div className="flex items-center gap-2">
            {liveEvaluation.is_positive ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <Ban className="h-5 w-5 text-slate-400" />
            )}
            <span className="bv103-type-section">
              {liveEvaluation.is_positive ? "Dương tính" : "Âm tính / chưa đủ tiêu chuẩn"}
            </span>
          </div>
        }
      >
        <div className="space-y-2 text-sm">
          <p>
            Phân loại:{" "}
            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 bv103-type-label font-semibold uppercase">
              {liveEvaluation.classification || formatNkbvChecklistTypeLabel(checklistType)}
            </span>
          </p>
          <p className="leading-relaxed text-slate-600">{liveEvaluation.reason}</p>
        </div>
      </NkbvDiagnosticRow>

      <ConfirmBlock
        ghiChuTuyBien={ghiChuTuyBien}
        setGhiChuTuyBien={setGhiChuTuyBien}
        clinicalConfirmed={clinicalConfirmed}
        setClinicalConfirmed={setClinicalConfirmed}
        ksnkConfirmed={ksnkConfirmed}
        setKsnkConfirmed={setKsnkConfirmed}
        canConfirmKsnk={canConfirmKsnk}
        allowedEdit={allowedEdit}
      />
    </div>
  );
}

function TypePicker({
  suggestedType,
  suggestedReason,
  specimenLabel,
  suspectedType,
  setSuspectedType,
  allowedEdit,
  lockType,
}: {
  suggestedType: NkbvSuspectedType;
  suggestedReason: string;
  specimenLabel: string;
  suspectedType: NkbvSuspectedType | null;
  setSuspectedType: (t: NkbvChecklistTypeCode) => void;
  allowedEdit: boolean;
  lockType?: NkbvChecklistTypeCode | null;
}) {
  const locked = Boolean(lockType && lockType !== "LOAI_TRU");
  if (locked && lockType) {
    return (
      <div className="space-y-3 rounded-[var(--radius-shell)] border-2 border-emerald-300 bg-emerald-50/70 p-4 sm:p-5">
        <p className="text-base font-semibold text-emerald-950">Sự kiện nhiễm khuẩn trên phiếu</p>
        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800">
          <p>
            Loại:{" "}
            <strong className="text-[var(--primary)]">{formatNkbvChecklistTypeLabel(lockType)}</strong>
            {" — "}khớp nhóm phân tích trên lưới bệnh án. Không đổi loại trên phiếu này.
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            Bệnh phẩm: <strong>{specimenLabel.trim() || "—"}</strong>
            {suggestedType !== lockType ? ` · Gợi ý bệnh phẩm khác (${formatNkbvChecklistTypeLabel(suggestedType)}) — giữ loại phiếu.` : ""}
          </p>
        </div>
        {allowedEdit ? (
          suspectedType === "LOAI_TRU" ? (
            <button
              type="button"
              onClick={() => setSuspectedType(lockType)}
              className="min-h-11 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-900"
            >
              Quay lại xác định {formatNkbvChecklistTypeLabel(lockType)}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSuspectedType("LOAI_TRU")}
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
            >
              Loại trừ ca này
            </button>
          )
        ) : null}
      </div>
    );
  }

  const userOverrode =
    suspectedType != null && suspectedType !== "LOAI_TRU" && suspectedType !== suggestedType;

  return (
    <div className="space-y-[var(--bv103-space-3)] rounded-[var(--radius-shell)] border-2 border-emerald-300 bg-emerald-50/70 p-4 sm:p-5">
      <div className="space-y-2">
        <p className="text-base font-semibold text-emerald-950">
          Chọn loại nhiễm khuẩn để nhập yếu tố chẩn đoán
        </p>
        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800">
          <p>
            Bệnh phẩm xét nghiệm:{" "}
            <strong className="text-slate-900">{specimenLabel.trim() || "— chưa ghi"}</strong>
          </p>
          <p className="mt-1.5">
            Gợi ý theo bệnh phẩm:{" "}
            <strong className="text-[var(--primary)]">
              {formatNkbvChecklistTypeLabel(suggestedType)}
            </strong>
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{suggestedReason}</p>
          {userOverrode ? (
            <p className="mt-2 text-xs font-semibold text-amber-800">
              Bạn đang chọn khác gợi ý: {formatNkbvChecklistTypeLabel(suspectedType)}. Form bên dưới
              theo lựa chọn của bạn.
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Đã chọn sẵn theo gợi ý bệnh phẩm. Giám sát viên có thể đổi loại bên dưới — form yếu tố
              chẩn đoán (triệu chứng + ngày) đổi theo loại.
            </p>
          )}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Loại nhiễm khuẩn (form nhập liệu tương ứng)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {(
            [
              { id: "UTI" as const, color: "border-blue-200 text-blue-900 bg-blue-50/40" },
              { id: "VAE" as const, color: "border-purple-200 text-purple-900 bg-purple-50/40" },
              { id: "VAP" as const, color: "border-fuchsia-200 text-fuchsia-900 bg-fuchsia-50/40" },
              { id: "HAP" as const, color: "border-indigo-200 text-indigo-900 bg-indigo-50/40" },
              { id: "BSI" as const, color: "border-rose-200 text-rose-900 bg-rose-50/40" },
              { id: "SSI" as const, color: "border-amber-200 text-amber-900 bg-amber-50/40" },
              { id: "CH17" as const, color: "border-violet-200 text-violet-900 bg-violet-50/40" },
              { id: "LOAI_TRU" as const, color: "border-slate-200 text-slate-800 bg-slate-50/60" },
            ] satisfies Array<{ id: NkbvChecklistTypeCode; color: string }>
          ).map((item) => {
            const isSuggested = item.id === suggestedType;
            const isSelected = suspectedType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!allowedEdit}
                onClick={() => setSuspectedType(item.id)}
                className={`relative min-h-14 rounded-xl border px-2 py-3 text-center bv103-type-label font-semibold transition touch-manipulation ${
                  isSelected
                    ? "border-[var(--primary)] bg-white text-[var(--primary)] shadow-sm ring-2 ring-emerald-500/20"
                    : `${item.color} hover:opacity-100`
                }`}
              >
                {isSuggested ? (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
                    Gợi ý
                  </span>
                ) : null}
                {NKBV_CHECKLIST_TYPE_PICKER_LABELS[item.id]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ConfirmBlock({
  ghiChuTuyBien,
  setGhiChuTuyBien,
  clinicalConfirmed,
  setClinicalConfirmed,
  ksnkConfirmed,
  setKsnkConfirmed,
  canConfirmKsnk,
  allowedEdit,
}: {
  ghiChuTuyBien: string;
  setGhiChuTuyBien: (v: string) => void;
  clinicalConfirmed: boolean;
  setClinicalConfirmed: (v: boolean) => void;
  ksnkConfirmed: boolean;
  setKsnkConfirmed: (v: boolean) => void;
  canConfirmKsnk: boolean;
  allowedEdit: boolean;
}) {
  return (
    <section className="bv103-stack-in bv103-layer-panel bv103-pad-panel border-2">
      <h3 className="bv103-type-section">Đối soát với khoa lâm sàng</h3>
      <p className="bv103-type-body text-slate-600">
        KSNK điền toàn bộ phiếu sau khi gọi hoặc gửi giấy khoa. Ý kiến khoa ghi vào ghi chú từng triệu
        chứng hoặc ô ghi chú dưới đây — khoa không cần đăng nhập.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <label className="inline-flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold cursor-pointer">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={clinicalConfirmed}
            disabled={!allowedEdit}
            onChange={(e) => setClinicalConfirmed(e.target.checked)}
          />
          Đã đối soát với khoa (gọi / gửi giấy)
        </label>
        <label
          className={`inline-flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
            canConfirmKsnk
              ? "cursor-pointer border-slate-200 bg-slate-50"
              : "cursor-not-allowed border-slate-100 bg-slate-50/50 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={ksnkConfirmed}
            disabled={!allowedEdit || !canConfirmKsnk}
            onChange={(e) => setKsnkConfirmed(e.target.checked)}
          />
          KSNK thống nhất / chốt ca
        </label>
      </div>
      <div>
        <label className={`${C.formLabel} text-slate-700`}>Ghi chú</label>
        <textarea
          value={ghiChuTuyBien}
          disabled={!allowedEdit}
          onChange={(e) => setGhiChuTuyBien(e.target.value)}
          rows={4}
          placeholder="Diễn biến đặc biệt, thiếu dữ liệu, lý do loại trừ…"
          className={`${C.controlInput} min-h-[110px] resize-y text-sm`}
        />
      </div>
    </section>
  );
}

function DeviceDateEditors({
  checklistType,
  allowedEdit,
  bsiForm,
  setBsiForm,
  utiForm,
  setUtiForm,
  vaeForm,
  setVaeForm,
  ngayVaoVien,
  ngayPhatHien,
}: {
  checklistType: NkbvActiveChecklistType;
  allowedEdit: boolean;
  bsiForm: BsiVerificationData | null;
  setBsiForm: (v: BsiVerificationData) => void;
  utiForm: UtiVerificationData | null;
  setUtiForm: (v: UtiVerificationData) => void;
  vaeForm: VaeVerificationData | null;
  setVaeForm: (v: VaeVerificationData) => void;
  ngayVaoVien: string;
  ngayPhatHien: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  if (checklistType === "BSI" && bsiForm) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={C.formLabelFlex}>
          Ngày đặt CVC
          <input
            type="date"
            className={`${C.controlInput} min-h-11`}
            value={bsiForm.device_placed_date || ""}
            disabled={!allowedEdit}
            min={ngayVaoVien || undefined}
            max={ngayPhatHien || today}
            onChange={(e) =>
              setBsiForm({ ...bsiForm, device_placed_date: e.target.value || undefined })
            }
          />
        </label>
        <label className={C.formLabelFlex}>
          Ngày rút (trống nếu còn lưu)
          <input
            type="date"
            className={`${C.controlInput} min-h-11`}
            value={bsiForm.device_removed_date || ""}
            disabled={!allowedEdit}
            min={bsiForm.device_placed_date || ngayVaoVien || undefined}
            max={today}
            onChange={(e) =>
              setBsiForm({ ...bsiForm, device_removed_date: e.target.value || undefined })
            }
          />
        </label>
      </div>
    );
  }
  if (checklistType === "UTI" && utiForm) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={C.formLabelFlex}>
          Ngày đặt Foley
          <input
            type="date"
            className={`${C.controlInput} min-h-11`}
            value={utiForm.device_placed_date || ""}
            disabled={!allowedEdit}
            min={ngayVaoVien || undefined}
            max={ngayPhatHien || today}
            onChange={(e) =>
              setUtiForm({ ...utiForm, device_placed_date: e.target.value || undefined })
            }
          />
        </label>
        <label className={C.formLabelFlex}>
          Ngày rút
          <input
            type="date"
            className={`${C.controlInput} min-h-11`}
            value={utiForm.device_removed_date || ""}
            disabled={!allowedEdit}
            min={utiForm.device_placed_date || ngayVaoVien || undefined}
            max={today}
            onChange={(e) =>
              setUtiForm({ ...utiForm, device_removed_date: e.target.value || undefined })
            }
          />
        </label>
        <label className="col-span-full inline-flex min-h-11 items-center gap-2 text-sm font-semibold cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={
              utiForm.foley_present_doe_or_prior !== undefined
                ? utiForm.foley_present_doe_or_prior
                : utiForm.foley_active_on_event
            }
            disabled={!allowedEdit}
            onChange={(e) =>
              setUtiForm({
                ...utiForm,
                foley_present_doe_or_prior: e.target.checked,
                foley_active_on_event: e.target.checked,
              })
            }
          />
          Foley hiện diện đúng DOE hoặc ngày trước (DOE−1)
        </label>
      </div>
    );
  }
  if (vaeForm && (checklistType === "VAE" || checklistType === "VAP" || checklistType === "HAP")) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className={C.formLabelFlex}>
          Ngày bắt đầu thở máy
          <input
            type="date"
            className={`${C.controlInput} min-h-11`}
            value={vaeForm.device_placed_date || ""}
            disabled={!allowedEdit}
            min={ngayVaoVien || undefined}
            max={ngayPhatHien || today}
            onChange={(e) =>
              setVaeForm({ ...vaeForm, device_placed_date: e.target.value || undefined })
            }
          />
        </label>
        <label className={C.formLabelFlex}>
          Ngày dừng thở máy
          <input
            type="date"
            className={`${C.controlInput} min-h-11`}
            value={vaeForm.device_removed_date || ""}
            disabled={!allowedEdit}
            min={vaeForm.device_placed_date || ngayVaoVien || undefined}
            max={today}
            onChange={(e) =>
              setVaeForm({ ...vaeForm, device_removed_date: e.target.value || undefined })
            }
          />
        </label>
      </div>
    );
  }
  return null;
}

function SecondaryEditors({
  checklistType,
  allowedEdit,
  bsiForm,
  setBsiForm,
  utiForm,
  setUtiForm,
  ssiForm,
  setSsiForm,
  symptomDates,
  onSymptomDateChange,
  iwpStart,
  iwpEnd,
  sbapStart,
  sbapEnd,
}: {
  checklistType: NkbvActiveChecklistType;
  allowedEdit: boolean;
  bsiForm: BsiVerificationData | null;
  setBsiForm: (v: BsiVerificationData) => void;
  utiForm: UtiVerificationData | null;
  setUtiForm: (v: UtiVerificationData) => void;
  ssiForm: SsiVerificationData | null;
  setSsiForm: (v: SsiVerificationData) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  iwpStart?: string;
  iwpEnd?: string;
  sbapStart?: string;
  sbapEnd?: string;
}) {
  if (checklistType === "BSI" && bsiForm) {
    return (
      <div className="space-y-3 text-sm">
        <label className="flex min-h-11 items-center gap-2 font-semibold cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={bsiForm.has_localized_infection}
            disabled={!allowedEdit}
            onChange={(e) => setBsiForm({ ...bsiForm, has_localized_infection: e.target.checked })}
          />
          Có ổ nhiễm trùng tại chỗ khác đạt chuẩn?
        </label>
        {bsiForm.has_localized_infection ? (
          <div className="space-y-2 rounded-xl border border-rose-100 bg-rose-50/50 p-4">
            <label className="flex min-h-10 items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bsiForm.localized_pathogen_matches}
                disabled={!allowedEdit}
                onChange={(e) =>
                  setBsiForm({ ...bsiForm, localized_pathogen_matches: e.target.checked })
                }
              />
              Tác nhân máu khớp ổ tại chỗ
            </label>
            <label className="flex min-h-10 items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bsiForm.is_in_sbap_window}
                disabled={!allowedEdit}
                onChange={(e) => setBsiForm({ ...bsiForm, is_in_sbap_window: e.target.checked })}
              />
              Cấy máu nằm trong cửa sổ SBAP
              {sbapStart && sbapEnd ? ` (${fmtDate(sbapStart)} → ${fmtDate(sbapEnd)})` : ""}
            </label>
          </div>
        ) : null}
      </div>
    );
  }
  if (checklistType === "UTI" && utiForm) {
    return (
      <div className="space-y-3 text-sm">
        <label className="flex min-h-11 items-center gap-2 font-semibold cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={utiForm.has_blood_culture_positive_in_window}
            disabled={!allowedEdit}
            onChange={(e) =>
              setUtiForm({ ...utiForm, has_blood_culture_positive_in_window: e.target.checked })
            }
          />
          Cấy máu (+) trong cửa sổ SBAP / IWP
        </label>
        {utiForm.has_blood_culture_positive_in_window ? (
          <div className="space-y-2 pl-1">
            <input
              type="date"
              className={`${C.controlInput} max-w-xs min-h-11`}
              value={symptomDates.has_blood_culture_positive_in_window || ""}
              disabled={!allowedEdit}
              min={sbapStart || iwpStart || undefined}
              max={sbapEnd || iwpEnd || undefined}
              onChange={(e) =>
                onSymptomDateChange("has_blood_culture_positive_in_window", e.target.value)
              }
            />
            <label className="flex min-h-10 items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={utiForm.blood_urine_pathogen_matches}
                disabled={!allowedEdit}
                onChange={(e) =>
                  setUtiForm({ ...utiForm, blood_urine_pathogen_matches: e.target.checked })
                }
              />
              Tác nhân máu khớp nước tiểu ≥10⁵
            </label>
          </div>
        ) : null}
      </div>
    );
  }
  if (checklistType === "SSI" && ssiForm) {
    return (
      <div className="space-y-3 text-sm">
        <label className="flex min-h-11 items-center gap-2 font-semibold cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={ssiForm.has_blood_culture_positive}
            disabled={!allowedEdit}
            onChange={(e) =>
              setSsiForm({ ...ssiForm, has_blood_culture_positive: e.target.checked })
            }
          />
          Cấy máu (+) (Secondary BSI)
        </label>
        {ssiForm.has_blood_culture_positive ? (
          <div className="space-y-2">
            <input
              type="date"
              className={`${C.controlInput} max-w-xs min-h-11`}
              value={symptomDates.has_blood_culture_positive || ""}
              disabled={!allowedEdit}
              min={sbapStart || undefined}
              max={sbapEnd || undefined}
              onChange={(e) => onSymptomDateChange("has_blood_culture_positive", e.target.value)}
            />
            <label className="flex min-h-10 items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ssiForm.blood_ssi_pathogen_matches}
                disabled={!allowedEdit}
                onChange={(e) =>
                  setSsiForm({ ...ssiForm, blood_ssi_pathogen_matches: e.target.checked })
                }
              />
              Trùng tác nhân vết mổ
            </label>
          </div>
        ) : null}
      </div>
    );
  }
  return null;
}
