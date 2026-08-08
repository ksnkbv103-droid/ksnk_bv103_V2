"use client";

import React, { useMemo } from "react";
import QrCameraButton from "@/components/shared/QrCameraButton";
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
import {
  ch17RuleForSite,
  countCh17Signs,
  isCh17SiteCriteriaMet,
} from "../../lib/nkbv-chapter17-clinical";
import { formSymptomRowsFor } from "../../lib/nkbv-clinical-symptom-catalog";
import type { SsiVerificationData } from "../../types/nkbv-verification";
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
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
}: SsiClinicalSubFormProps) {
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
              <label className="mb-1 block text-xs font-bold">Mã phẫu thuật NHSN</label>
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
                <p className="mt-1 text-[10px] text-slate-500">{proc.name_en}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Ngày phẫu thuật</label>
              <input
                type="date"
                value={form.surgery_date || ""}
                disabled={!allowedEdit}
                onChange={(e) => onChange(syncDays(form, { surgery_date: e.target.value || undefined }))}
                className={C.controlInput}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">DOE (ngày sự kiện)</label>
              <input
                type="date"
                value={form.doe_date || ""}
                disabled={!allowedEdit}
                onChange={(e) => onChange(syncDays(form, { doe_date: e.target.value || undefined }))}
                className={C.controlInput}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold">Số ngày sau mổ</label>
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
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_implant}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, has_implant: e.target.checked })}
            />
            Có implant (thuộc tính ca — không quyết định SP khi đã có mã PT)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.is_patos}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, is_patos: e.target.checked })}
            />
            PATOS — nhiễm đã có tại thời điểm mổ
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
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
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
              <span className="text-[11px] font-bold text-slate-400">Ngày cấy máu ∈ cửa sổ theo dõi:</span>
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
          <label className="mb-1 block text-xs font-bold">
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
              <label className="mb-1 block text-xs font-bold">
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
              {(() => {
                const rule = ch17RuleForSite(form.organ_space_site);
                if (!rule) {
                  return form.organ_space_site ? (
                    <p className="text-[11px] text-slate-500">
                      Site {form.organ_space_site}: dùng tiêu chí Organ/Space chung (mủ dẫn lưu /
                      cấy / áp xe). Checklist Ch.17 chi tiết sẽ bổ sung theo từng site.
                    </p>
                  ) : null;
                }
                const flags = form.chapter17_flags || {};
                const n = countCh17Signs(rule, flags);
                const status = isCh17SiteCriteriaMet({
                  siteCode: form.organ_space_site,
                  flags,
                  procedureCode: form.loai_phau_thuat_nhsn,
                });
                return (
                  <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3 space-y-2">
                    <p className="text-[11px] font-bold text-violet-900">
                      Chương 17 — {rule.name_vi} (cần ≥{rule.min_signs})
                    </p>
                    {rule.signs.map((s) => (
                      <label
                        key={s.key}
                        className="flex items-center gap-2 text-xs font-semibold cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={flags[s.key] === true}
                          disabled={!allowedEdit || isTimeframeExpired}
                          onChange={(e) =>
                            onChange({
                              ...form,
                              chapter17_flags: { ...flags, [s.key]: e.target.checked },
                            })
                          }
                        />
                        {s.label_vi}
                      </label>
                    ))}
                    <p
                      className={`text-[11px] ${status.met ? "text-emerald-800" : "text-amber-900"}`}
                    >
                      {status.reason} · đang chọn {n}/{rule.min_signs}
                    </p>
                  </div>
                );
              })()}
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
