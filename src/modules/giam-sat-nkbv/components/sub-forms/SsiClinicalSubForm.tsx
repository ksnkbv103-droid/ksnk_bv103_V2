"use client";

import React, { useEffect, useMemo } from "react";
import QrCameraButton from "@/components/shared/QrCameraButton";
import {
  ageYearsFromNgaySinh,
  resolveIsInfantLe1Flag,
} from "../../lib/nkbv-age-ui";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import {
  depthFromSsiEventType,
  formatNhsnOptionLabel,
  getNhsnProcedure,
  NKBV_NHSN_PROCEDURES,
  NKBV_NHSN_SSI_EVENT_TYPES,
  organSpaceSitesForProcedure,
  resolveSsiSurveillanceDays,
  secondaryIncisionMismatchWarning,
} from "../../lib/nkbv-ssi-nhsn-catalog";
import { formSymptomRowsFor } from "../../lib/nkbv-clinical-symptom-catalog";
import type { SsiVerificationData } from "../../types/nkbv-verification";
import NkbvCh17CriteriaChecklist from "../NkbvCh17CriteriaChecklist";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";
import NkbvCatalogSymptomRows from "./NkbvCatalogSymptomRows";

interface SsiClinicalSubFormProps {
  form: SsiVerificationData;
  onChange: (updated: SsiVerificationData) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  allowedEdit: boolean;
  ngayVaoVien?: string;
  ngayPhatHien?: string;
  ngaySinh?: string | null;
  iwpStart?: string;
  iwpEnd?: string;
  activeTab?: "LAM_SANG" | "KSNK" | "VI_SINH";
  classificationBadge?: string | null;
  embedded?: boolean;
}

function syncDays(form: SsiVerificationData, patch: Partial<SsiVerificationData>): SsiVerificationData {
  const next = { ...form, ...patch };
  if (next.surgery_date && next.doe_date) {
    const a = Date.parse(next.surgery_date.slice(0, 10));
    const b = Date.parse(next.doe_date.slice(0, 10));
    if (Number.isFinite(a) && Number.isFinite(b) && b >= a) {
      next.days_since_surgery = Math.round((b - a) / 86400000);
    }
  }
  return next;
}

export default function SsiClinicalSubForm({
  form,
  onChange,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  ngayPhatHien,
  ngaySinh,
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
}: SsiClinicalSubFormProps) {
  const ageYears = ageYearsFromNgaySinh(ngaySinh, ngayPhatHien);
  const infantFlag = resolveIsInfantLe1Flag(ageYears);

  useEffect(() => {
    if (form.is_infant_le1 === infantFlag) return;
    onChange({ ...form, is_infant_le1: infantFlag });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sync on age gate
  }, [infantFlag]);

  const eventDepth = depthFromSsiEventType(form.ssi_event_type);
  const depth = eventDepth || form.ssi_depth;
  const limitDays = resolveSsiSurveillanceDays({
    depth,
    procedureCode: form.loai_phau_thuat_nhsn,
    hasImplantFallback: form.has_implant,
    eventTypeCode: form.ssi_event_type,
  });
  const isTimeframeExpired = form.days_since_surgery > limitDays;
  const showMicro = activeTab === "LAM_SANG" || activeTab === "VI_SINH";
  const showClinical = activeTab === "LAM_SANG";
  const siteOptions = useMemo(
    () => organSpaceSitesForProcedure(form.loai_phau_thuat_nhsn),
    [form.loai_phau_thuat_nhsn],
  );
  const proc = getNhsnProcedure(form.loai_phau_thuat_nhsn);
  const secondaryWarn = secondaryIncisionMismatchWarning(
    form.ssi_event_type,
    form.loai_phau_thuat_nhsn,
  );
  const survStart = form.surgery_date || undefined;
  const survEnd = form.surgery_date
    ? (() => {
        const d = new Date(`${form.surgery_date}T12:00:00`);
        d.setDate(d.getDate() + limitDays);
        return d.toISOString().slice(0, 10);
      })()
    : undefined;

  const applyEventType = (code: string) => {
    const d = depthFromSsiEventType(code);
    onChange({
      ...form,
      ssi_event_type: code || undefined,
      ssi_depth: d || form.ssi_depth,
      organ_space_site: d === "ORGAN_SPACE" ? form.organ_space_site : undefined,
    });
  };

  return (
    <NkbvDomainFormShell
      title="Phiếu SSI (nhiễm khuẩn vết mổ)"
      subtypeLabel="Nhiễm khuẩn vết mổ"
      indexFactorHint="SP nông luôn 30 ngày; Deep/Organ theo mã phẫu thuật NHSN (30 hoặc 90) — không dùng IWP ±3."
      windowLabel="Cửa sổ theo dõi sau mổ"
      windowStart={survStart}
      windowEnd={survEnd}
      windowExtra={`${limitDays} ngày · ${form.days_since_surgery} ngày sau mổ${proc ? ` · ${proc.code}` : ""}`}
      classificationBadge={classificationBadge}
      embedded={embedded}
    >
      <div className="space-y-2 rounded-[var(--radius-shell)] border border-emerald-100 bg-emerald-50/60 p-4">
        <label className={`${C.formLabel} text-emerald-800`}>Mã QR bộ dụng cụ CSSD</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={form.ma_qr_cssd_lien_quan || ""}
            disabled={!allowedEdit}
            onChange={(e) => onChange({ ...form, ma_qr_cssd_lien_quan: e.target.value.toUpperCase() })}
            placeholder="Quét hoặc nhập mã QR chu trình..."
            className={`${C.controlInput} min-w-0 flex-1`}
          />
          <QrCameraButton
            disabled={!allowedEdit}
            onScan={(code) => onChange({ ...form, ma_qr_cssd_lien_quan: code })}
            title="Quét QR bộ CSSD"
          />
        </div>
      </div>

      {showClinical && (
        <NkbvFormSection title="Phẫu thuật & PATOS" hint="Mã PT NHSN quyết định SP Deep/Organ; ngày mổ + DOE tự tính.">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block bv103-type-label font-semibold">Mã phẫu thuật NHSN</label>
              <select
                value={form.loai_phau_thuat_nhsn || ""}
                disabled={!allowedEdit}
                onChange={(e) => {
                  const code = e.target.value;
                  const nextSite =
                    form.organ_space_site &&
                    organSpaceSitesForProcedure(code).some((s) => s.code === form.organ_space_site)
                      ? form.organ_space_site
                      : undefined;
                  onChange({
                    ...form,
                    loai_phau_thuat_nhsn: code,
                    organ_space_site: nextSite,
                  });
                }}
                className={C.controlInput}
              >
                <option value="">— Chọn mã phẫu thuật —</option>
                {NKBV_NHSN_PROCEDURES.map((p) => (
                  <option key={p.code} value={p.code} title={p.name_en}>
                    {formatNhsnOptionLabel(p)}
                    {p.deep_organ_surveillance_days === 90 ? " · SP90" : " · SP30"}
                  </option>
                ))}
              </select>
              {proc ? (
                <p className="mt-1 text-[11px] text-slate-500">{proc.name_en}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block bv103-type-label font-semibold">Ngày phẫu thuật</label>
              <input
                type="date"
                value={form.surgery_date || ""}
                disabled={!allowedEdit}
                onChange={(e) => onChange(syncDays(form, { surgery_date: e.target.value || undefined }))}
                className={C.controlInput}
              />
            </div>
            <div>
              <label className="mb-1 block bv103-type-label font-semibold">DOE (ngày sự kiện)</label>
              <input
                type="date"
                value={form.doe_date || ""}
                disabled={!allowedEdit}
                onChange={(e) => onChange(syncDays(form, { doe_date: e.target.value || undefined }))}
                className={C.controlInput}
              />
            </div>
            <div>
              <label className="mb-1 block bv103-type-label font-semibold">Số ngày sau mổ</label>
              <input
                type="number"
                value={form.days_since_surgery}
                disabled={!allowedEdit}
                onChange={(e) =>
                  onChange({ ...form, days_since_surgery: parseInt(e.target.value) || 0 })
                }
                className={C.controlInput}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 bv103-type-label font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_implant}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, has_implant: e.target.checked })}
            />
            Có implant (thuộc tính ca — không quyết định SP khi đã có mã PT)
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            PATOS — nhiễm đã có tại thời điểm mổ
            <select
              className={C.controlInput}
              disabled={!allowedEdit}
              value={
                form.is_patos === true ? "yes" : form.is_patos === false ? "no" : ""
              }
              onChange={(e) =>
                onChange({
                  ...form,
                  is_patos:
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "yes",
                })
              }
            >
              <option value="">— Chưa chọn —</option>
              <option value="yes">Có (PATOS)</option>
              <option value="no">Không</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.return_to_or_within_24h}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, return_to_or_within_24h: e.target.checked })}
            />
            Quay lại phòng mổ trong 24 giờ
          </label>
          {isTimeframeExpired ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-2 text-[11px] text-red-800">
              Vượt surveillance {limitDays} ngày.
            </p>
          ) : null}
        </NkbvFormSection>
      )}

      {showMicro && (
        <NkbvFormSection title="Vi sinh & Secondary BSI" hint="SBAP quanh ngày sự kiện SSI.">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.superficial_culture_positive}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, superficial_culture_positive: e.target.checked })}
            />
            Cấy nông (+)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.organ_space_culture_positive}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, organ_space_culture_positive: e.target.checked })}
            />
            Cấy organ/space (+)
          </label>
          <label className="flex items-center gap-2 bv103-type-label font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_blood_culture_positive}
              disabled={!allowedEdit || isTimeframeExpired}
              onChange={(e) => onChange({ ...form, has_blood_culture_positive: e.target.checked })}
            />
            Cấy máu (+) (Secondary BSI)
          </label>
          {form.has_blood_culture_positive ? (
            <div className="space-y-2 pl-6">
              <span className="bv103-type-label font-semibold text-slate-400">Ngày cấy máu ∈ cửa sổ theo dõi:</span>
              <input
                type="date"
                value={symptomDates.has_blood_culture_positive || ""}
                disabled={!allowedEdit}
                min={survStart}
                max={survEnd}
                onChange={(e) => onSymptomDateChange("has_blood_culture_positive", e.target.value)}
                className="rounded-lg border-slate-200 px-2 py-1 text-xs"
              />
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.blood_ssi_pathogen_matches}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, blood_ssi_pathogen_matches: e.target.checked })}
                />
                Trùng tác nhân vết mổ
              </label>
            </div>
          ) : null}
        </NkbvFormSection>
      )}

      {showClinical && (
        <NkbvFormSection title="Loại sự kiện & tiêu chí" hint="SIP/SIS/DIP/DIS hoặc Organ/Space + mã vị trí Ch.17.">
          <label className="mb-1 block bv103-type-label font-semibold">
            Mã loại sự kiện SSI (bắt buộc khi chốt)
          </label>
          <select
            value={form.ssi_event_type || ""}
            disabled={!allowedEdit || isTimeframeExpired}
            onChange={(e) => applyEventType(e.target.value)}
            className={C.controlInput}
          >
            <option value="">— Chọn SIP / SIS / DIP / DIS / Organ —</option>
            {NKBV_NHSN_SSI_EVENT_TYPES.map((ev) => (
              <option key={ev.code} value={ev.code} title={ev.name_en}>
                {formatNhsnOptionLabel(ev)}
              </option>
            ))}
          </select>
          {secondaryWarn ? (
            <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-950">
              {secondaryWarn}
            </p>
          ) : null}
          {depth === "ORGAN_SPACE" ? (
            <div className="mt-2 space-y-2">
              <label className="mb-1 block bv103-type-label font-semibold">
                Mã vị trí Organ/Space (bắt buộc)
              </label>
              <select
                value={form.organ_space_site || ""}
                disabled={!allowedEdit || isTimeframeExpired}
                onChange={(e) =>
                  onChange({
                    ...form,
                    organ_space_site: e.target.value || undefined,
                    chapter17_flags: {},
                  })
                }
                className={C.controlInput}
              >
                <option value="">— Chọn vị trí cơ quan —</option>
                {siteOptions.map((s) => (
                  <option key={s.code} value={s.code} title={s.name_en}>
                    {formatNhsnOptionLabel(s)}
                  </option>
                ))}
              </select>
              <NkbvCh17CriteriaChecklist
                typeCode={form.organ_space_site}
                flags={form.chapter17_flags || {}}
                procedureCode={form.loai_phau_thuat_nhsn}
                isInfantLe1={infantFlag}
                allowedEdit={allowedEdit && !isTimeframeExpired}
                onFlagsChange={(chapter17_flags) => onChange({ ...form, chapter17_flags })}
              />
            </div>
          ) : null}
          {depth === "SUPERFICIAL" || depth === "DEEP" || depth === "ORGAN_SPACE" ? (
            <NkbvCatalogSymptomRows
              rows={formSymptomRowsFor("SSI", {
                ssiDepth: depth,
                procedureCode: form.loai_phau_thuat_nhsn,
              }).filter(
                (r) =>
                  r.form_field !== "superficial_culture_positive" &&
                  r.form_field !== "organ_space_culture_positive",
              )}
              form={form as unknown as Record<string, unknown>}
              onToggle={(field, checked) =>
                onChange({ ...form, [field]: checked } as SsiVerificationData)
              }
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
            />
          ) : null}
        </NkbvFormSection>
      )}
    </NkbvDomainFormShell>
  );
}
