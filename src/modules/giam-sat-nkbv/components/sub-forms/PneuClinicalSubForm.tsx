"use client";

import React from "react";
import {
  countPneuRespiratoryLines,
  formSymptomRowsFor,
} from "../../lib/nkbv-clinical-symptom-catalog";
import { syncPneuSystemicBundle } from "../../lib/nkbv-pneu-systemic";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import type { VaeVerificationData } from "../../types/nkbv-verification";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";
import NkbvCatalogSymptomRows from "./NkbvCatalogSymptomRows";

interface PneuClinicalSubFormProps {
  form: VaeVerificationData;
  onChange: (updated: VaeVerificationData) => void;
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

function syncRespCount(form: VaeVerificationData, patch: Partial<VaeVerificationData>): VaeVerificationData {
  const next = { ...form, ...patch };
  // Chỉ đếm dòng hô hấp catalog (pneu_resp_line) — PNU3/infant phụ không nâng local count
  next.respiratory_symptoms_count = countPneuRespiratoryLines(
    next as unknown as Record<string, unknown>,
  );
  return next;
}

function pneuAgeBranch(age: number): "INFANT_LE1" | "CHILD_1_12" | "ADULT" {
  if (age > 0 && age <= 1) return "INFANT_LE1";
  if (age > 1 && age <= 12) return "CHILD_1_12";
  return "ADULT";
}

export default function PneuClinicalSubForm({
  form,
  onChange,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  ngayVaoVien,
  ngayPhatHien,
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
}: PneuClinicalSubFormProps) {
  const showMicro = activeTab === "LAM_SANG" || activeTab === "VI_SINH";
  const showClinical = activeTab === "LAM_SANG";
  const trigger = form.pneu_trigger || "CULTURE";
  const ageBranch = pneuAgeBranch(form.patient_age || 0);
  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);
  /** Ngày X-quang là mốc Index khi chọn hình ảnh — không khóa trong IWP (IWP suy ra từ ngày này). */
  const imagingDateMin = cleanNgayVaoVien || undefined;
  const imagingDateMax = cleanNgayPhatHien || todayStr;

  return (
    <NkbvDomainFormShell
      title="Phiếu viêm phổi (PNEU / VAP / HAP)"
      subtypeLabel="Viêm phổi bệnh viện"
      indexFactorHint="Chọn cấy đờm hoặc X-quang/CT — cái dùng để chẩn đoán (nếu cả hai có ngày thì lấy ngày sớm hơn làm mốc). Không dùng phiếu này cho VAE người lớn thở máy."
      windowLabel="IWP (cửa sổ nhiễm khuẩn ±3 ngày)"
      windowStart={iwpStart}
      windowEnd={iwpEnd}
      classificationBadge={classificationBadge}
      embedded={embedded}
    >
      <NkbvFormSection
        title="Yếu tố xác định khung IWP"
        hint="Mốc Index = ngày yếu tố dương tính đầu dùng cho tiêu chuẩn → IWP = mốc ± 3 ngày."
      >
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="pneu_trigger"
              checked={trigger === "CULTURE"}
              disabled={!allowedEdit}
              onChange={() => onChange({ ...form, pneu_trigger: "CULTURE" })}
            />
            Cấy đờm / BAL (ngày mẫu vi sinh)
          </label>
          <label className="inline-flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="pneu_trigger"
              checked={trigger === "IMAGING"}
              disabled={!allowedEdit}
              onChange={() => onChange({ ...form, pneu_trigger: "IMAGING" })}
            />
            X-quang / CT (ngày phim bất thường)
          </label>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">Tuổi bệnh nhân</label>
          <input
            type="number"
            value={form.patient_age}
            disabled={!allowedEdit}
            onChange={(e) => onChange({ ...form, patient_age: parseInt(e.target.value) || 0 })}
            className={C.controlInput}
          />
          {ageBranch === "INFANT_LE1" ? (
            <p className="mt-1 text-[11px] text-violet-800">
              Nhánh ≤1 tuổi: ưu tiên thở nhanh / thở khó / suy trao đổi khí + toàn thân trong IWP (checklist tối thiểu).
            </p>
          ) : ageBranch === "CHILD_1_12" ? (
            <p className="mt-1 text-[11px] text-violet-800">
              Nhánh 1–12 tuổi: hình ảnh + toàn thân + ≥2 triệu chứng hô hấp tại chỗ (gồm thở khó/thở nhanh) trong IWP.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-600">
              Nhánh người lớn: hình ảnh + toàn thân (≥1) + hô hấp tại chỗ (≥2) trong IWP. Lú lẫn chỉ khi ≥70 tuổi.
            </p>
          )}
        </div>
      </NkbvFormSection>

      {showMicro && (
        <NkbvFormSection title="Bằng chứng nuôi cấy">
          <select
            value={form.microbiology_evidence}
            disabled={!allowedEdit}
            onChange={(e) =>
              onChange({
                ...form,
                microbiology_evidence: e.target.value as "NONE" | "PNU2" | "PNU3",
              })
            }
            className={C.controlInput}
          >
            <option value="NONE">PNU1 — lâm sàng + hình ảnh</option>
            <option value="PNU2">PNU2 — có cấy / virus đạt ngưỡng</option>
            <option value="PNU3">PNU3 — nấm / suy giảm miễn dịch</option>
          </select>
        </NkbvFormSection>
      )}

      {showClinical && (
        <>
          <NkbvFormSection
            title={
              trigger === "IMAGING"
                ? "Hình ảnh (yếu tố xác định khung)"
                : "Hình ảnh (bắt buộc hội tụ trong IWP)"
            }
          >
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_chest_imaging_abnormal}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, has_chest_imaging_abnormal: e.target.checked })}
              />
              X-quang/CT thâm nhiễm mới / đông đặc / hang
            </label>
            {form.has_chest_imaging_abnormal ? (
              <div className="ml-6 space-y-1">
                <span className="text-[11px] font-bold text-slate-400">
                  {trigger === "IMAGING" ? "Ngày phim (mốc Index):" : "Ngày phim ∈ IWP:"}
                </span>
                <input
                  type="date"
                  value={symptomDates.has_chest_imaging_abnormal || ""}
                  disabled={!allowedEdit}
                  min={trigger === "IMAGING" ? imagingDateMin : iwpStart || imagingDateMin}
                  max={trigger === "IMAGING" ? imagingDateMax : iwpEnd || imagingDateMax}
                  onChange={(e) => onSymptomDateChange("has_chest_imaging_abnormal", e.target.value)}
                  className="block rounded-lg border-slate-200 px-2 py-1 text-xs"
                  required={trigger === "IMAGING"}
                />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_cardiopulmonary_disease_underlying}
                disabled={!allowedEdit}
                onChange={(e) =>
                  onChange({ ...form, has_cardiopulmonary_disease_underlying: e.target.checked })
                }
              />
              Bệnh nền tim phổi (cần ≥2 phim)
            </label>
            <div>
              <label className="mb-1 block text-xs font-bold">Số phim bất thường</label>
              <input
                type="number"
                value={form.imaging_films_count}
                disabled={!allowedEdit}
                onChange={(e) =>
                  onChange({ ...form, imaging_films_count: parseInt(e.target.value) || 0 })
                }
                className={C.controlInput}
              />
            </div>
          </NkbvFormSection>

          <NkbvFormSection
            title="Triệu chứng trong IWP"
            hint="SSOT catalog · toàn thân ≥1 + hô hấp ≥2 dòng. Mỗi dấu hiệu dương tính gắn ngày ∈ IWP."
          >
            <p className="text-[11px] font-bold uppercase text-slate-400">
              Toàn thân (tách sốt / hạ thân nhiệt / WBC)
            </p>
            <NkbvCatalogSymptomRows
              rows={formSymptomRowsFor("PNEU").filter(
                (r) =>
                  r.group === "Toàn thân PNEU" ||
                  (ageBranch === "ADULT" && r.form_field === "altered_mental_status_ge_70yo"),
              )}
              form={form as unknown as Record<string, unknown>}
              onToggle={(field, checked) =>
                onChange(
                  syncPneuSystemicBundle(form, {
                    [field]: checked,
                  } as Partial<VaeVerificationData>),
                )
              }
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
            />
            <p className="text-[11px] font-bold uppercase text-slate-400">Hô hấp tại chỗ</p>
            <NkbvCatalogSymptomRows
              rows={formSymptomRowsFor("PNEU").filter((r) => {
                if (!r.pneu_resp_line) return false;
                if (ageBranch === "INFANT_LE1") {
                  return (
                    r.form_field === "has_dyspnea" ||
                    r.form_field === "has_tachypnea" ||
                    r.form_field === "has_worsening_gas_exchange" ||
                    r.form_field === "has_rales_or_wheeze" ||
                    r.form_field === "has_purulent_sputum_symptom"
                  );
                }
                return true;
              })}
              form={form as unknown as Record<string, unknown>}
              onToggle={(field, checked) =>
                onChange(syncRespCount(form, { [field]: checked } as Partial<VaeVerificationData>))
              }
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
            />
            {ageBranch === "INFANT_LE1" ? (
              <>
                <p className="text-[11px] font-bold uppercase text-violet-500">Bổ sung ≤1 tuổi</p>
                <NkbvCatalogSymptomRows
                  rows={formSymptomRowsFor("PNEU").filter((r) => r.age_gate === "le1")}
                  form={form as unknown as Record<string, unknown>}
                  onToggle={(field, checked) =>
                    onChange(syncRespCount(form, { [field]: checked } as Partial<VaeVerificationData>))
                  }
                  symptomDates={symptomDates}
                  onSymptomDateChange={onSymptomDateChange}
                  allowedEdit={allowedEdit}
                  iwpStart={iwpStart}
                  iwpEnd={iwpEnd}
                />
              </>
            ) : null}
            {form.microbiology_evidence === "PNU3" ? (
              <>
                <p className="text-[11px] font-bold uppercase text-amber-600">PNU3 bổ sung</p>
                <NkbvCatalogSymptomRows
                  rows={formSymptomRowsFor("PNEU").filter(
                    (r) =>
                      r.form_field === "has_hemoptysis" ||
                      r.form_field === "has_pleuritic_chest_pain",
                  )}
                  form={form as unknown as Record<string, unknown>}
                  onToggle={(field, checked) =>
                    onChange(syncRespCount(form, { [field]: checked } as Partial<VaeVerificationData>))
                  }
                  symptomDates={symptomDates}
                  onSymptomDateChange={onSymptomDateChange}
                  allowedEdit={allowedEdit}
                  iwpStart={iwpStart}
                  iwpEnd={iwpEnd}
                />
              </>
            ) : null}
            <p className="text-[11px] text-slate-500">
              Đếm hô hấp: <strong>{form.respiratory_symptoms_count}</strong> / cần ≥
              {ageBranch === "INFANT_LE1" || ageBranch === "CHILD_1_12" ? "3 (nhánh trẻ)" : "2"}
              {ageBranch === "INFANT_LE1" ? " · kèm suy trao đổi khí" : ""}
            </p>
          </NkbvFormSection>
        </>
      )}
    </NkbvDomainFormShell>
  );
}
