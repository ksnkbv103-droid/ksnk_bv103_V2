"use client";

import React, { useEffect } from "react";
import {
  ageYearsFromNgaySinh,
  resolveIsInfantLe1Flag,
  showInfantCriteriaUi,
} from "../../lib/nkbv-age-ui";
import { formSymptomRowsFor } from "../../lib/nkbv-clinical-symptom-catalog";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import type { BsiVerificationData } from "../../types/nkbv-verification";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";
import NkbvCatalogSymptomRows from "./NkbvCatalogSymptomRows";

interface BsiClinicalSubFormProps {
  form: BsiVerificationData;
  onChange: (updated: BsiVerificationData) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  allowedEdit: boolean;
  liveDeviceDays?: number;
  liveDeviceActive?: boolean;
  ngayVaoVien?: string;
  ngayPhatHien?: string;
  /** Ngày sinh — thiếu/DOB người lớn → ẩn LCBI 3 */
  ngaySinh?: string | null;
  iwpStart?: string;
  iwpEnd?: string;
  activeTab?: "LAM_SANG" | "KSNK" | "VI_SINH";
  classificationBadge?: string | null;
  embedded?: boolean;
  /** Ẩn khối khi đã tách sang hàng chẩn đoán riêng */
  omitSections?: Array<"device" | "secondary">;
}

function patchSymptoms(
  form: BsiVerificationData,
  patch: Partial<BsiVerificationData>,
): BsiVerificationData {
  const next = { ...form, ...patch };
  const or =
    !!next.has_fever ||
    !!next.has_chills ||
    !!next.has_hypotension ||
    (!!next.is_infant_le1 &&
      (!!next.has_hypothermia || !!next.has_apnea || !!next.has_bradycardia));
  next.symptoms_window_7days = or || !!next.symptoms_window_7days;
  if (patch.has_fever !== undefined || patch.has_chills !== undefined || patch.has_hypotension !== undefined) {
    next.symptoms_window_7days =
      !!next.has_fever || !!next.has_chills || !!next.has_hypotension ||
      (!!next.is_infant_le1 &&
        (!!next.has_hypothermia || !!next.has_apnea || !!next.has_bradycardia));
  }
  return next;
}

export default function BsiClinicalSubForm({
  form,
  onChange,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  liveDeviceDays,
  liveDeviceActive,
  ngayVaoVien,
  ngayPhatHien,
  ngaySinh,
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
  omitSections = [],
}: BsiClinicalSubFormProps) {
  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const ageYears = ageYearsFromNgaySinh(ngaySinh, cleanNgayPhatHien || undefined);
  const showInfantUi = showInfantCriteriaUi(ageYears);
  const infantFlag = resolveIsInfantLe1Flag(ageYears);

  useEffect(() => {
    if (form.is_infant_le1 === infantFlag) return;
    if (!infantFlag) {
      onChange(
        patchSymptoms(form, {
          is_infant_le1: false,
          has_hypothermia: false,
          has_apnea: false,
          has_bradycardia: false,
        }),
      );
      return;
    }
    onChange(patchSymptoms(form, { is_infant_le1: true }));
    // Chỉ đồng bộ khi tuổi / cờ lệch — không phụ thuộc toàn form
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sync on age gate
  }, [infantFlag]);

  const showMicro = activeTab === "LAM_SANG" || activeTab === "VI_SINH";
  const showClinical = activeTab === "LAM_SANG";
  const showDevice = !omitSections.includes("device");
  const showSecondary = !omitSections.includes("secondary");
  const lcbi2Rows = formSymptomRowsFor("BSI").filter(
    (r) =>
      r.form_field === "has_fever" ||
      r.form_field === "has_chills" ||
      r.form_field === "has_hypotension",
  );
  const lcbi3Rows = formSymptomRowsFor("BSI").filter((r) => r.age_gate === "le1");
  const mbiDiarrheaRows = formSymptomRowsFor("BSI").filter(
    (r) => r.form_field === "has_severe_diarrhea_mbi",
  );
  const toggleSymptom = (field: string, checked: boolean) => {
    onChange(patchSymptoms(form, { [field]: checked } as Partial<BsiVerificationData>));
  };

  return (
    <NkbvDomainFormShell
      title="Phiếu BSI / CLABSI"
      subtypeLabel="Nhiễm khuẩn máu"
      indexFactorHint="Cấy máu dương tính. Kiểm tra nhiễm khuẩn máu thứ phát (ổ tại chỗ + cửa sổ SBAP) trước khi gán CLABSI."
      windowLabel="IWP (cửa sổ nhiễm khuẩn ±3 ngày)"
      windowStart={iwpStart}
      windowEnd={iwpEnd}
      classificationBadge={classificationBadge}
      embedded={embedded}
    >
      {showMicro && (
        <NkbvFormSection title="Vi sinh (từ LIS — chỉnh nếu sai)" hint="Recognized = 1 mẫu đủ; Commensal cần ≥2 lần lấy riêng + triệu chứng.">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Tên tác nhân</label>
            <input
              value={form.pathogen_name}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, pathogen_name: e.target.value })}
              className={C.controlInput}
              placeholder="VD: Staphylococcus aureus"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Loại tác nhân</label>
              <select
                value={form.pathogen_type}
                disabled={!allowedEdit}
                onChange={(e) =>
                  onChange({
                    ...form,
                    pathogen_type: e.target.value as "RECOGNIZED" | "COMMON_COMMENSAL",
                  })
                }
                className={C.controlInput}
              >
                <option value="RECOGNIZED">Mầm bệnh đã được công nhận (LCBI 1)</option>
                <option value="COMMON_COMMENSAL">Vi khuẩn cộng sinh da (LCBI 2/3)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tác nhân đường ruột?</label>
              <select
                value={form.is_intestinal_pathogen ? "true" : "false"}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, is_intestinal_pathogen: e.target.value === "true" })}
                className={C.controlInput}
              >
                <option value="false">Không</option>
                <option value="true">Có (Candida, Enterococcus…)</option>
              </select>
            </div>
          </div>
          {form.pathogen_type === "COMMON_COMMENSAL" && (
            <div className="space-y-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-amber-700">Số lần cấy riêng biệt (+)</label>
                  <input
                    type="number"
                    value={form.commensal_culture_count}
                    disabled={!allowedEdit}
                    onChange={(e) =>
                      onChange({ ...form, commensal_culture_count: parseInt(e.target.value) || 0 })
                    }
                    className="w-full rounded-lg border-amber-200 bg-white px-2 py-1 text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 pt-5 text-[11px] font-bold text-amber-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.commensal_drawn_separate}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, commensal_drawn_separate: e.target.checked })}
                  />
                  Lấy vị trí/giờ khác nhau
                </label>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_fungi_respiratory}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, is_fungi_respiratory: e.target.checked })}
            />
            Nấm hô hấp cộng đồng (Blastomyces, Histoplasma…)?
          </label>
        </NkbvFormSection>
      )}

      {showClinical && (
        <>
          {showDevice ? (
          <NkbvFormSection
            title="Dụng cụ — Catheter tĩnh mạch trung tâm (CVC)"
            hint="Ưu tiên lấy từ sổ đăng ký dụng cụ. Hiện diện ngày sự kiện hoặc ngày trước mới gắn CLABSI."
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày đặt CVC</label>
                <input
                  type="date"
                  value={form.device_placed_date || ""}
                  disabled={!allowedEdit}
                  min={cleanNgayVaoVien || undefined}
                  max={cleanNgayPhatHien || todayStr}
                  onChange={(e) => onChange({ ...form, device_placed_date: e.target.value || undefined })}
                  className={C.controlInput}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày rút (trống nếu còn lưu)</label>
                <input
                  type="date"
                  value={form.device_removed_date || ""}
                  disabled={!allowedEdit}
                  min={form.device_placed_date || cleanNgayVaoVien || undefined}
                  max={todayStr}
                  onChange={(e) => onChange({ ...form, device_removed_date: e.target.value || undefined })}
                  className={C.controlInput}
                />
              </div>
            </div>
            {form.device_placed_date ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-2.5 text-[11px] text-emerald-900">
                CVC {liveDeviceDays ?? form.cvc_placed_days} ngày ·{" "}
                {(liveDeviceActive ?? form.cvc_active_on_event) ? "Hiện diện DOE/DOE−1" : "Không hiện diện ngày sự kiện"}
              </div>
            ) : null}
          </NkbvFormSection>
          ) : null}

          <NkbvFormSection
            title="Triệu chứng trong IWP"
            hint="SSOT catalog · bắt buộc cho LCBI 2 (commensal). Mỗi tick gắn ngày thuộc IWP."
          >
            <NkbvCatalogSymptomRows
              rows={lcbi2Rows}
              form={form as unknown as Record<string, unknown>}
              onToggle={toggleSymptom}
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
            />
            {showInfantUi ? (
              <>
                <p className="border-t border-slate-100 pt-3 text-[11px] font-semibold text-violet-800">
                  Bệnh nhi ≤ 1 tuổi (theo ngày sinh) — LCBI 3
                </p>
                <div className="rounded-lg border border-violet-100 bg-violet-50/80 p-3">
                  <NkbvCatalogSymptomRows
                    rows={lcbi3Rows}
                    form={form as unknown as Record<string, unknown>}
                    onToggle={toggleSymptom}
                    symptomDates={symptomDates}
                    onSymptomDateChange={onSymptomDateChange}
                    allowedEdit={allowedEdit}
                    iwpStart={iwpStart}
                    iwpEnd={iwpEnd}
                  />
                </div>
              </>
            ) : null}
          </NkbvFormSection>

          <NkbvFormSection title="MBI-LCBI" hint="Ghép tế bào gốc / giảm bạch cầu hạt nặng · tiêu chảy nặng (catalog).">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_neutropenia}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, is_neutropenia: e.target.checked })}
              />
              ANC &lt; 500 hoặc suy giảm miễn dịch nặng
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.has_hsct_or_gvhd}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, has_hsct_or_gvhd: e.target.checked })}
              />
              HSCT / GVHD
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.anc_wbc_lt_500_ge_2d}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, anc_wbc_lt_500_ge_2d: e.target.checked })}
              />
              ANC/WBC &lt; 500 ≥ 2 ngày trong IWP
            </label>
            <NkbvCatalogSymptomRows
              rows={mbiDiarrheaRows}
              form={form as unknown as Record<string, unknown>}
              onToggle={toggleSymptom}
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
            />
          </NkbvFormSection>

          {showSecondary ? (
          <NkbvFormSection
            title="Nhiễm khuẩn máu thứ phát (loại trừ CLABSI tiên phát)"
            hint="Ổ tại chỗ đạt chuẩn + khớp tác nhân + cấy máu trong cửa sổ SBAP."
          >
            <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_localized_infection}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, has_localized_infection: e.target.checked })}
              />
              Có ổ nhiễm trùng tại chỗ khác đạt chuẩn CDC?
            </label>
            {form.has_localized_infection ? (
              <div className="space-y-2 rounded-xl border border-[var(--primary)]/10 bg-[var(--primary)]/5 p-3">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.localized_pathogen_matches}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, localized_pathogen_matches: e.target.checked })}
                  />
                  Tác nhân máu khớp ổ tại chỗ
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_in_sbap_window}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, is_in_sbap_window: e.target.checked })}
                  />
                  Cấy máu trong khung SBAP (~14 ngày)
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.blood_mandatory_for_localized}
                    disabled={!allowedEdit}
                    onChange={(e) =>
                      onChange({ ...form, blood_mandatory_for_localized: e.target.checked })
                    }
                  />
                  Cấy máu bắt buộc cho ổ tại chỗ (scenario 2)
                </label>
              </div>
            ) : null}
          </NkbvFormSection>
          ) : null}
        </>
      )}
    </NkbvDomainFormShell>
  );
}
