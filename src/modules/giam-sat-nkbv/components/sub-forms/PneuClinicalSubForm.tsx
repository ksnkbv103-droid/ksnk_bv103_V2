"use client";

import React, { useEffect } from "react";
import {
  ageYearsFromNgaySinh,
  coerceAdultPatientAge,
  pneuAgeUiBranchFromAge,
} from "../../lib/nkbv-age-ui";
import {
  countPneuRespiratoryLines,
  formSymptomRowsFor,
} from "../../lib/nkbv-clinical-symptom-catalog";
import {
  applyPneuLabDerivedFlags,
  derivePneuLabTier,
  PNEU_IC_ATOM_ROWS,
  type PneuLabSemiQuant,
  type PneuLabSpecimen,
} from "../../lib/nkbv-pneu-lab-tier";
import { syncPneuSystemicBundle } from "../../lib/nkbv-pneu-systemic";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import type { VaeVerificationData } from "../../types/nkbv-verification";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";
import NkbvCatalogSymptomRows from "./NkbvCatalogSymptomRows";

const TABLE3_ROWS: Array<{ field: keyof VaeVerificationData; label: string }> = [
  { field: "pneu_t3_influenza", label: "Influenza (PCR/Ag)" },
  { field: "pneu_t3_rsv", label: "RSV" },
  { field: "pneu_t3_other_virus", label: "Virus hô hấp khác (Adeno/Para/HMPV…)" },
  { field: "pneu_t3_legionella", label: "Legionella (cấy/PCR/Ag nước tiểu/IFA)" },
  { field: "pneu_t3_mycoplasma", label: "Mycoplasma" },
  { field: "pneu_t3_chlamydia", label: "Chlamydia / Chlamydophila" },
  { field: "pneu_t3_bordetella", label: "Bordetella" },
];

const IC_ROWS = PNEU_IC_ATOM_ROWS;

function patchPneuLab(
  form: VaeVerificationData,
  patch: Partial<VaeVerificationData>,
): VaeVerificationData {
  const touchT3 = TABLE3_ROWS.some((r) => r.field in patch);
  const touchIc = IC_ROWS.some((r) => r.field in patch);
  return applyPneuLabDerivedFlags(
    { ...form, ...patch },
    { resetTable3Aggregate: touchT3, resetIcAggregate: touchIc },
  );
}

interface PneuClinicalSubFormProps {
  form: VaeVerificationData;
  onChange: (updated: VaeVerificationData) => void;
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

function syncRespCount(form: VaeVerificationData, patch: Partial<VaeVerificationData>): VaeVerificationData {
  const next = { ...form, ...patch };
  // Chỉ đếm dòng hô hấp catalog (pneu_resp_line) — PNU3/infant phụ không nâng local count
  next.respiratory_symptoms_count = countPneuRespiratoryLines(
    next as unknown as Record<string, unknown>,
  );
  return next;
}

export default function PneuClinicalSubForm({
  form,
  onChange,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  ngayVaoVien,
  ngayPhatHien,
  ngaySinh,
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
}: PneuClinicalSubFormProps) {
  const showMicro = activeTab === "LAM_SANG" || activeTab === "VI_SINH";
  const showClinical = activeTab === "LAM_SANG";
  const trigger = form.pneu_trigger || "CULTURE";
  const ageFromDob = ageYearsFromNgaySinh(ngaySinh, ngayPhatHien);
  const ageBranch = pneuAgeUiBranchFromAge(ageFromDob);
  const coercedAge = coerceAdultPatientAge(ageFromDob, form.patient_age);

  useEffect(() => {
    if (form.patient_age === coercedAge) return;
    onChange({ ...form, patient_age: coercedAge });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync age from DOB / adult coerce
  }, [coercedAge]);
  const labTier = derivePneuLabTier(form);
  const showPnu3Sx =
    labTier.tier === "PNU3" ||
    !!form.pneu_is_immunocompromised ||
    form.microbiology_evidence === "PNU3";
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
          <label className="mb-1 block bv103-type-label font-semibold text-slate-700">Tuổi bệnh nhân</label>
          <input
            type="number"
            value={form.patient_age}
            disabled={!allowedEdit || ageFromDob != null}
            onChange={(e) => {
              const raw = parseInt(e.target.value) || 0;
              // Thiếu DOB: không cho nhập tuổi nhi mở nhánh PNEU trẻ
              onChange({
                ...form,
                patient_age: coerceAdultPatientAge(null, raw),
              });
            }}
            className={C.controlInput}
          />
          {ageFromDob != null ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Theo ngày sinh ({ageFromDob} tuổi) — không sửa tay.
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              Chưa có ngày sinh → mặc định nhánh người lớn (tuổi &lt; 13 bị ép ≥ 45).
            </p>
          )}
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
        <NkbvFormSection
          title="Vi sinh nâng bậc (lab-first)"
          hint="PNU1/2/3 suy từ loại mẫu + CFU/bán định lượng + Table 3 — không chọn tay bậc chẩn đoán. Vi khuẩn thường trên đờm không đủ nâng PNU2."
        >
          <div>
            <label className="mb-1 block bv103-type-label font-semibold">Loại mẫu</label>
            <select
              value={form.pneu_lab_specimen || "NONE"}
              disabled={!allowedEdit}
              onChange={(e) =>
                onChange(
                  patchPneuLab(form, {
                    pneu_lab_specimen: e.target.value as PneuLabSpecimen,
                  }),
                )
              }
              className={C.controlInput}
            >
              <option value="NONE">Chưa có / không dùng lab nâng bậc</option>
              <option value="BLOOD">Cấy máu</option>
              <option value="PLEURAL">Dịch màng phổi</option>
              <option value="LUNG_TISSUE">Mô phổi</option>
              <option value="BAL">BAL</option>
              <option value="PBAL">PBAL</option>
              <option value="PSB">PSB</option>
              <option value="ETA">ETA (nội khí quản)</option>
              <option value="SPUTUM">Đờm</option>
              <option value="OTHER_LRT">LRT khác (minimally contaminated)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block bv103-type-label font-semibold">Tác nhân</label>
            <input
              type="text"
              value={form.pneu_lab_organism || ""}
              disabled={!allowedEdit}
              placeholder="VD: K. pneumoniae, RSV…"
              onChange={(e) =>
                onChange(patchPneuLab(form, { pneu_lab_organism: e.target.value }))
              }
              className={C.controlInput}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block bv103-type-label font-semibold">CFU/ml</label>
              <input
                type="number"
                value={form.pneu_lab_cfu_per_ml ?? ""}
                disabled={!allowedEdit}
                placeholder="BAL≥10⁴ · PSB≥10³ · ETA≥10⁵"
                onChange={(e) =>
                  onChange(
                    patchPneuLab(form, {
                      pneu_lab_cfu_per_ml: e.target.value
                        ? parseFloat(e.target.value)
                        : null,
                    }),
                  )
                }
                className={C.controlInput}
              />
            </div>
            <div>
              <label className="mb-1 block bv103-type-label font-semibold">Bán định lượng</label>
              <select
                value={form.pneu_lab_semi_quant || "NONE"}
                disabled={!allowedEdit}
                onChange={(e) =>
                  onChange(
                    patchPneuLab(form, {
                      pneu_lab_semi_quant: e.target.value as PneuLabSemiQuant,
                    }),
                  )
                }
                className={C.controlInput}
              >
                <option value="NONE">—</option>
                <option value="LIGHT">Light / 1+</option>
                <option value="MODERATE">Moderate / 2+</option>
                <option value="HEAVY">Heavy / 3+</option>
                <option value="MANY">Many / 4+</option>
                <option value="PLUS_2">2+</option>
                <option value="PLUS_3">3+</option>
                <option value="PLUS_4">4+</option>
              </select>
            </div>
          </div>
          <div className="space-y-1 rounded-lg border border-slate-100 bg-white/60 px-2 py-2">
            <p className="bv103-type-label text-slate-400">
              Table 3 — virus / nội bào không điển hình
            </p>
            {TABLE3_ROWS.map((r) => (
              <label
                key={String(r.field)}
                className="flex items-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={Boolean(form[r.field])}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onChange(patchPneuLab(form, { [r.field]: e.target.checked }))
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.pneu_lab_bal_intracellular_ge_5pct}
              disabled={!allowedEdit}
              onChange={(e) =>
                onChange(
                  patchPneuLab(form, {
                    pneu_lab_bal_intracellular_ge_5pct: e.target.checked,
                  }),
                )
              }
            />
            BAL: ≥5% BC có vi khuẩn nội bào
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.pneu_lab_histopath_positive}
              disabled={!allowedEdit}
              onChange={(e) =>
                onChange(
                  patchPneuLab(form, { pneu_lab_histopath_positive: e.target.checked }),
                )
              }
            />
            Mô bệnh học phù hợp viêm phổi / xâm nhập nấm
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.pneu_lab_is_normal_flora}
              disabled={!allowedEdit}
              onChange={(e) =>
                onChange(
                  patchPneuLab(form, { pneu_lab_is_normal_flora: e.target.checked }),
                )
              }
            />
            Flora bình thường / hỗn hợp đường hô hấp (loại khỏi PNU2/3)
          </label>
          <div className="space-y-1 rounded-lg border border-amber-100 bg-amber-50/40 px-2 py-2">
            <p className="bv103-type-label text-amber-600">
              Suy giảm miễn dịch (cửa PNU3)
            </p>
            {IC_ROWS.map((r) => (
              <label
                key={String(r.field)}
                className="flex items-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={Boolean(form[r.field])}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onChange(patchPneuLab(form, { [r.field]: e.target.checked }))
                  }
                />
                {r.label}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.pneu_candida_blood_and_lrt_match}
              disabled={!allowedEdit}
              onChange={(e) =>
                onChange(
                  patchPneuLab(form, {
                    pneu_candida_blood_and_lrt_match: e.target.checked,
                  }),
                )
              }
            />
            Candida máu khớp LRT trong IWP (ngoại lệ PNU3)
          </label>
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              labTier.tier === "PNU3"
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : labTier.tier === "PNU2"
                  ? "border-sky-300 bg-sky-50 text-sky-900"
                  : labTier.lab_excluded
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className="font-bold">
              Bậc vi sinh suy ra:{" "}
              {labTier.tier === "NONE"
                ? "PNU1 (không lab đạt ngưỡng)"
                : labTier.tier}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug">{labTier.reasons.join(" ")}</p>
          </div>
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
                <span className="bv103-type-label font-semibold text-slate-400">
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
              <label className="mb-1 block bv103-type-label font-semibold">Số phim bất thường</label>
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
            <p className="bv103-type-label text-slate-400">
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
            <p className="bv103-type-label text-slate-400">Hô hấp tại chỗ</p>
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
                <p className="bv103-type-label text-violet-500">Bổ sung ≤1 tuổi</p>
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
            {showPnu3Sx ? (
              <>
                <p className="bv103-type-label text-amber-600">PNU3 bổ sung</p>
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
              Đếm nhóm hô hấp CDC: <strong>{form.respiratory_symptoms_count}</strong> / cần ≥
              {ageBranch === "INFANT_LE1" || ageBranch === "CHILD_1_12" ? "3 (nhánh trẻ)" : "2"}
              {ageBranch === "INFANT_LE1" ? " · kèm suy trao đổi khí" : ""}
              {" "}
              (khó thở + thở nhanh = 1 nhóm)
            </p>
          </NkbvFormSection>
        </>
      )}
    </NkbvDomainFormShell>
  );
}
