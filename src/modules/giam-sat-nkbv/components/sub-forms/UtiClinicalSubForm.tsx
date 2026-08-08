"use client";

import React from "react";
import { formSymptomRowsFor } from "../../lib/nkbv-clinical-symptom-catalog";
import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import type { UtiVerificationData } from "../../types/nkbv-verification";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";
import NkbvCatalogSymptomRows from "./NkbvCatalogSymptomRows";

interface UtiClinicalSubFormProps {
  form: UtiVerificationData;
  onChange: (updated: UtiVerificationData) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  allowedEdit: boolean;
  liveDeviceDays?: number;
  liveDeviceActive?: boolean;
  ngayVaoVien?: string;
  ngayPhatHien?: string;
  iwpStart?: string;
  iwpEnd?: string;
  activeTab?: "LAM_SANG" | "KSNK" | "VI_SINH";
  classificationBadge?: string | null;
  embedded?: boolean;
  omitSections?: Array<"device" | "secondary">;
}

export default function UtiClinicalSubForm({
  form,
  onChange,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  liveDeviceDays,
  liveDeviceActive,
  ngayVaoVien,
  ngayPhatHien,
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
  omitSections = [],
}: UtiClinicalSubFormProps) {
  const showDevice = !omitSections.includes("device");
  const showSecondary = !omitSections.includes("secondary");
  const isMicrobiologyBlocked = form.pathogen_count > 2 || form.has_fungi_yeast_parasite;
  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const showMicro = activeTab === "LAM_SANG" || activeTab === "VI_SINH";
  const showClinical = activeTab === "LAM_SANG";
  const foleyActive =
    form.foley_present_doe_or_prior !== undefined
      ? form.foley_present_doe_or_prior
      : liveDeviceActive !== undefined
        ? liveDeviceActive
        : form.foley_active_on_event;

  return (
    <NkbvDomainFormShell
      title="Phiếu UTI / CAUTI"
      subtypeLabel="Nhiễm khuẩn tiết niệu"
      indexFactorHint="Cấy nước tiểu ≥10⁵ CFU/ml (≤2 chủng, không nấm). CAUTI khi Foley ≥2 ngày và hiện diện ngày sự kiện hoặc ngày trước."
      windowLabel="IWP (cửa sổ nhiễm khuẩn ±3 ngày)"
      windowStart={iwpStart}
      windowEnd={iwpEnd}
      classificationBadge={classificationBadge}
      embedded={embedded}
    >
      {showMicro && (
        <NkbvFormSection title="Vi sinh nước tiểu" hint=">2 chủng hoặc nấm → loại trừ CAUTI/UTI.">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">CFU/ml</label>
              <input
                type="number"
                value={form.urine_cfu_count}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, urine_cfu_count: parseInt(e.target.value) || 0 })}
                className={C.controlInput}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Số chủng</label>
              <input
                type="number"
                value={form.pathogen_count}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, pathogen_count: parseInt(e.target.value) || 1 })}
                className={C.controlInput}
              />
            </div>
          </div>
          {form.pathogen_count > 2 ? (
            <p className="rounded-xl border border-red-100 bg-red-50 p-2 text-[11px] text-red-800">
              Tạp nhiễm (&gt;2 chủng) — CDC không chẩn đoán UTI/CAUTI.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-xs font-bold text-amber-800 cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_fungi_yeast_parasite}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, has_fungi_yeast_parasite: e.target.checked })}
            />
            Có nấm Candida / men / ký sinh trùng?
          </label>
        </NkbvFormSection>
      )}

      {showClinical && (
        <>
          {showDevice ? (
          <NkbvFormSection
            title="Ống thông tiểu Foley (CAUTI)"
            hint="Ưu tiên lấy từ sổ đăng ký dụng cụ. Xác nhận hiện diện ngày sự kiện hoặc ngày trước."
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày đặt Foley</label>
                <input
                  type="date"
                  value={form.device_placed_date || ""}
                  disabled={!allowedEdit || isMicrobiologyBlocked}
                  min={cleanNgayVaoVien || undefined}
                  max={cleanNgayPhatHien || todayStr}
                  onChange={(e) => onChange({ ...form, device_placed_date: e.target.value || undefined })}
                  className={C.controlInput}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày rút</label>
                <input
                  type="date"
                  value={form.device_removed_date || ""}
                  disabled={!allowedEdit || isMicrobiologyBlocked}
                  min={form.device_placed_date || cleanNgayVaoVien || undefined}
                  max={todayStr}
                  onChange={(e) => onChange({ ...form, device_removed_date: e.target.value || undefined })}
                  className={C.controlInput}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={
                  form.foley_present_doe_or_prior !== undefined
                    ? form.foley_present_doe_or_prior
                    : foleyActive
                }
                disabled={!allowedEdit || isMicrobiologyBlocked}
                onChange={(e) =>
                  onChange({
                    ...form,
                    foley_present_doe_or_prior: e.target.checked,
                    foley_active_on_event: e.target.checked,
                  })
                }
              />
              Foley hiện diện đúng DOE hoặc ngày trước (DOE−1)
            </label>
            {form.device_placed_date ? (
              <p className="text-[11px] text-emerald-800">
                Foley {liveDeviceDays ?? form.foley_placed_days} ngày ·{" "}
                {foleyActive ? "Đủ điều kiện gắn CAUTI (nếu ≥2 ngày)" : "Không gắn CAUTI"}
              </p>
            ) : null}
          </NkbvFormSection>
          ) : null}

          <NkbvFormSection
            title="Triệu chứng trong IWP"
            hint="SSOT catalog · tiểu buốt/gấp/rắt chỉ khi KHÔNG đặt Foley tại chỗ."
          >
            <NkbvCatalogSymptomRows
              rows={formSymptomRowsFor("UTI", { foleyActive: !!foleyActive }).filter(
                (r) => r.age_gate !== "le1",
              )}
              form={form as unknown as Record<string, unknown>}
              onToggle={(field, checked) =>
                onChange({ ...form, [field]: checked } as UtiVerificationData)
              }
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
              disabled={isMicrobiologyBlocked}
            />
            {foleyActive ? (
              <p className="text-[11px] text-amber-800">
                Đang Foley → không nhập tiểu buốt/gấp/rắt (tiêu chuẩn loại trừ).
              </p>
            ) : null}
            <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.is_infant_le1}
                disabled={!allowedEdit || isMicrobiologyBlocked}
                onChange={(e) => onChange({ ...form, is_infant_le1: e.target.checked })}
              />
              ≤ 1 tuổi (SUTI 2 tối thiểu)
            </label>
            {form.is_infant_le1 ? (
              <div className="rounded-lg border border-violet-100 bg-violet-50/70 p-3">
                <NkbvCatalogSymptomRows
                  rows={formSymptomRowsFor("UTI").filter((r) => r.age_gate === "le1")}
                  form={form as unknown as Record<string, unknown>}
                  onToggle={(field, checked) =>
                    onChange({ ...form, [field]: checked } as UtiVerificationData)
                  }
                  symptomDates={symptomDates}
                  onSymptomDateChange={onSymptomDateChange}
                  allowedEdit={allowedEdit}
                  iwpStart={iwpStart}
                  iwpEnd={iwpEnd}
                  disabled={isMicrobiologyBlocked}
                />
              </div>
            ) : null}
          </NkbvFormSection>

          {showSecondary ? (
          <NkbvFormSection title="ABUTI / Secondary BSI" hint="Không triệu chứng UTI nhưng máu khớp nước tiểu trong cửa sổ.">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_blood_culture_positive_in_window}
                disabled={!allowedEdit || isMicrobiologyBlocked}
                onChange={(e) =>
                  onChange({ ...form, has_blood_culture_positive_in_window: e.target.checked })
                }
              />
              Cấy máu (+) trong khung ~7 ngày
            </label>
            {form.has_blood_culture_positive_in_window ? (
              <div className="space-y-2 pl-6">
                <input
                  type="date"
                  value={symptomDates.has_blood_culture_positive_in_window || ""}
                  disabled={!allowedEdit || isMicrobiologyBlocked}
                  min={iwpStart || undefined}
                  max={iwpEnd || undefined}
                  onChange={(e) =>
                    onSymptomDateChange("has_blood_culture_positive_in_window", e.target.value)
                  }
                  className="rounded-lg border-slate-200 px-2 py-1 text-xs"
                />
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.blood_urine_pathogen_matches}
                    disabled={!allowedEdit || isMicrobiologyBlocked}
                    onChange={(e) =>
                      onChange({ ...form, blood_urine_pathogen_matches: e.target.checked })
                    }
                  />
                  Tác nhân máu khớp nước tiểu ≥10⁵
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
