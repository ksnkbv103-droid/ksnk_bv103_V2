"use client";

import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import React from "react";
import { formSymptomRowsFor } from "../../lib/nkbv-clinical-symptom-catalog";
import type { VaeVerificationData, VaeVentDailyParam } from "../../types/nkbv-verification";
import {
  buildEmptyVentDays,
  computeVacFromDailyVent,
} from "../../lib/nkbv-vae-vent-compute";
import NkbvDomainFormShell from "../NkbvDomainFormShell";
import NkbvFormSection from "../NkbvFormSection";
import NkbvCatalogSymptomRows from "./NkbvCatalogSymptomRows";

interface VaeClinicalSubFormProps {
  form: VaeVerificationData;
  onChange: (updated: VaeVerificationData) => void;
  symptomDates: Record<string, string>;
  onSymptomDateChange: (key: string, date: string) => void;
  allowedEdit: boolean;
  liveDeviceDays?: number;
  ngayVaoVien?: string;
  ngayPhatHien?: string;
  iwpStart?: string;
  iwpEnd?: string;
  activeTab?: "LAM_SANG" | "KSNK" | "VI_SINH";
  classificationBadge?: string | null;
  embedded?: boolean;
}

export default function VaeClinicalSubForm({
  form,
  onChange,
  symptomDates,
  onSymptomDateChange,
  allowedEdit,
  liveDeviceDays,
  ngayVaoVien,
  ngayPhatHien,
  iwpStart,
  iwpEnd,
  activeTab = "LAM_SANG",
  classificationBadge,
  embedded = false,
}: VaeClinicalSubFormProps) {
  const isVaeInvalid = form.patient_age < 18;
  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const showMicro = activeTab === "LAM_SANG" || activeTab === "VI_SINH";
  const showClinical = activeTab === "LAM_SANG";

  const daily = form.vent_daily_params || [];
  const vacHint = computeVacFromDailyVent(daily);

  const applyVacHint = () => {
    if (!vacHint.has_stable_baseline) return;
    onChange({
      ...form,
      has_stable_baseline_peep_fio2: true,
      peep_increase_ge_3: vacHint.peep_increase_ge_3,
      fio2_increase_ge_20: vacHint.fio2_increase_ge_20,
      calculated_doe: vacHint.suggested_doe || form.calculated_doe,
    });
    if (vacHint.suggested_doe) {
      if (vacHint.peep_increase_ge_3) onSymptomDateChange("peep_increase_ge_3", vacHint.suggested_doe);
      if (vacHint.fio2_increase_ge_20) onSymptomDateChange("fio2_increase_ge_20", vacHint.suggested_doe);
    }
  };

  const ensureDailyRows = () => {
    if (!form.device_placed_date) return;
    if (daily.length >= 4) return;
    onChange({
      ...form,
      vent_daily_params: buildEmptyVentDays(form.device_placed_date, Math.max(7, liveDeviceDays || 7)),
    });
  };

  const updateDaily = (idx: number, patch: Partial<VaeVentDailyParam>) => {
    const next = [...daily];
    next[idx] = { ...next[idx], ...patch };
    onChange({ ...form, vent_daily_params: next });
  };

  const addDailyRow = () => {
    const last = daily[daily.length - 1]?.date;
    let nextDate = form.device_placed_date || todayStr;
    if (last) {
      const d = new Date(`${last}T12:00:00`);
      d.setDate(d.getDate() + 1);
      nextDate = d.toISOString().slice(0, 10);
    }
    onChange({
      ...form,
      vent_daily_params: [...daily, { date: nextDate, peep_min: null, fio2_min: null }],
    });
  };

  return (
    <NkbvDomainFormShell
      title="Phiếu VAE (VAC → IVAC → PVAP)"
      subtypeLabel="Sự cố liên quan thở máy"
      indexFactorHint="Xấu đi thông số máy thở (PEEP / FiO₂) — không dùng X-quang. Cửa sổ = Event Period (không phải IWP ±3 ngày)."
      windowLabel="Event Period"
      windowStart={iwpStart}
      windowEnd={iwpEnd}
      windowExtra="Ngày sự kiện = ngày bắt đầu xấu đi PEEP/FiO₂"
      classificationBadge={classificationBadge}
      embedded={embedded}
    >
      {showClinical && (
        <div className="space-y-[var(--bv103-space-3)] animate-in fade-in">
          <NkbvFormSection title="Bậc 1 — Thiết bị & tuổi" hint="VAE ≥18 tuổi; thở máy ≥4 ngày liên tục.">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block bv103-type-label font-semibold text-slate-700">Tuổi</label>
                <input
                  type="number"
                  value={form.patient_age}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, patient_age: parseInt(e.target.value) || 0 })}
                  className={C.controlInput}
                />
              </div>
              <div>
                <label className="mb-1 block bv103-type-label font-semibold text-slate-700">Bắt đầu thở máy</label>
                <input
                  type="date"
                  value={form.device_placed_date || ""}
                  disabled={!allowedEdit}
                  min={cleanNgayVaoVien || undefined}
                  max={cleanNgayPhatHien || todayStr}
                  onChange={(e) =>
                    onChange({
                      ...form,
                      device_placed_date: e.target.value || undefined,
                      vent_daily_params: e.target.value
                        ? buildEmptyVentDays(e.target.value, 7)
                        : form.vent_daily_params,
                    })
                  }
                  className={C.controlInput}
                />
              </div>
              <div>
                <label className="mb-1 block bv103-type-label font-semibold text-slate-700">Dừng thở máy</label>
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
            {isVaeInvalid ? (
              <p className="rounded-xl border border-red-100 bg-red-50 p-2 text-[11px] text-red-800">
                VAE chỉ ≥18 tuổi thở máy ≥4 ngày. Trẻ / không đủ ngày → chọn VAP hoặc HAP (PNEU).
              </p>
            ) : null}
            <div className="flex flex-wrap gap-4 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.on_aprv_or_hfv}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, on_aprv_or_hfv: e.target.checked })}
                />
                APRV / HFV — loại khỏi VAC ngày này
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.on_ecmo}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, on_ecmo: e.target.checked })}
                />
                ECMO — loại khỏi giám sát VAE ngày này
              </label>
            </div>
            {form.device_placed_date && !isVaeInvalid ? (
              <p className="text-[11px] text-emerald-800">
                Ngày thở máy: <strong>{liveDeviceDays !== undefined ? liveDeviceDays : form.vent_days}</strong> (yêu
                cầu ≥4)
              </p>
            ) : null}
          </NkbvFormSection>

          <div className="space-y-3 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50/75 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bảng PEEP / FiO₂ tối thiểu (yếu tố xác định VAC)
              </span>
              {allowedEdit ? (
                <div className="flex gap-2">
                  <button type="button" onClick={ensureDailyRows} className="bv103-type-label font-semibold text-sky-700">
                    Tạo 7 ngày
                  </button>
                  <button type="button" onClick={addDailyRow} className="bv103-type-label font-semibold text-sky-700">
                    + Ngày
                  </button>
                </div>
              ) : null}
            </div>
            {daily.length === 0 ? (
              <p className="text-[11px] text-slate-500">Chọn ngày bắt đầu thở máy để sinh bảng.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] border-collapse text-xs">
                  <thead>
                    <tr className="font-bold uppercase text-slate-400">
                      <th className="px-2 py-1.5 text-left">Ngày</th>
                      <th className="px-2 py-1.5 text-left">PEEP min</th>
                      <th className="px-2 py-1.5 text-left">FiO₂ min %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((row, idx) => (
                      <tr key={`${row.date}-${idx}`} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            value={row.date}
                            disabled={!allowedEdit || isVaeInvalid}
                            onChange={(e) => updateDaily(idx, { date: e.target.value })}
                            className={C.controlInput}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.peep_min ?? ""}
                            disabled={!allowedEdit || isVaeInvalid}
                            onChange={(e) =>
                              updateDaily(idx, {
                                peep_min: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className={C.controlInput}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            type="number"
                            value={row.fio2_min ?? ""}
                            disabled={!allowedEdit || isVaeInvalid}
                            onChange={(e) =>
                              updateDaily(idx, {
                                fio2_min: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            className={C.controlInput}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-slate-700">{vacHint.reason}</p>
            {vacHint.suggested_doe && allowedEdit ? (
              <button
                type="button"
                onClick={applyVacHint}
                className="rounded-full bg-sky-600 px-3 py-1 bv103-type-label font-semibold text-white"
              >
                Áp dụng gợi ý VAC (DOE {vacHint.suggested_doe})
              </button>
            ) : null}
          </div>

          <NkbvFormSection title="Bậc 1 — Xác nhận VAC">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.has_stable_baseline_peep_fio2}
                disabled={!allowedEdit || isVaeInvalid}
                onChange={(e) => onChange({ ...form, has_stable_baseline_peep_fio2: e.target.checked })}
              />
              ≥2 ngày ổn định PEEP/FiO₂
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.peep_increase_ge_3}
                disabled={!allowedEdit || isVaeInvalid}
                onChange={(e) => onChange({ ...form, peep_increase_ge_3: e.target.checked })}
              />
              PEEP ↑ ≥3 ≥2 ngày
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={form.fio2_increase_ge_20}
                disabled={!allowedEdit || isVaeInvalid}
                onChange={(e) => onChange({ ...form, fio2_increase_ge_20: e.target.checked })}
              />
              FiO₂ ↑ ≥20% ≥2 ngày
            </label>
          </NkbvFormSection>

          <NkbvFormSection
            title="Bậc 2 — IVAC"
            hint="SSOT catalog · Event Period (DOE ±2 ngày) — không dùng checklist PNEU/XQ."
          >
            <NkbvCatalogSymptomRows
              rows={formSymptomRowsFor("VAE")}
              form={form as unknown as Record<string, unknown>}
              onToggle={(field, checked) =>
                onChange({ ...form, [field]: checked } as VaeVerificationData)
              }
              symptomDates={symptomDates}
              onSymptomDateChange={onSymptomDateChange}
              allowedEdit={allowedEdit}
              iwpStart={iwpStart}
              iwpEnd={iwpEnd}
              disabled={isVaeInvalid}
            />
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={form.new_antimicrobial_ge_4days}
                disabled={!allowedEdit || isVaeInvalid}
                onChange={(e) => onChange({ ...form, new_antimicrobial_ge_4days: e.target.checked })}
              />
              Kháng sinh mới ≥4 QAD trong cửa sổ
            </label>
          </NkbvFormSection>
        </div>
      )}

      {showMicro && (
        <NkbvFormSection title="Bậc 3 — PVAP (vi sinh)" hint="Chỉ nâng cấp sau IVAC; không X-quang.">
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_purulent_sputum_and_positive_culture}
              disabled={!allowedEdit || isVaeInvalid}
              onChange={(e) =>
                onChange({ ...form, has_purulent_sputum_and_positive_culture: e.target.checked })
              }
            />
            Gram đờm mủ + cấy (+)
          </label>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_quantitative_culture_positive}
              disabled={!allowedEdit || isVaeInvalid}
              onChange={(e) =>
                onChange({ ...form, has_quantitative_culture_positive: e.target.checked })
              }
            />
            Cấy định lượng đạt ngưỡng
          </label>
          <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={form.has_respiratory_viral_or_pathogen_test_positive}
              disabled={!allowedEdit || isVaeInvalid}
              onChange={(e) =>
                onChange({
                  ...form,
                  has_respiratory_viral_or_pathogen_test_positive: e.target.checked,
                })
              }
            />
            Virus / Legionella / GPB (+)
          </label>

          {(form.has_purulent_sputum_and_positive_culture ||
            form.has_quantitative_culture_positive ||
            form.has_respiratory_viral_or_pathogen_test_positive) && (
            <div className="mt-2 space-y-2 rounded-xl border border-rose-100 bg-rose-50/70 p-3">
              <p className="bv103-type-label font-semibold text-rose-900">Secondary BSI khi PVAP (Event Period)</p>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.has_blood_culture_in_event_period}
                  disabled={!allowedEdit}
                  onChange={(e) =>
                    onChange({ ...form, has_blood_culture_in_event_period: e.target.checked })
                  }
                />
                Cấy máu (+) trong Event Period
              </label>
              {form.has_blood_culture_in_event_period ? (
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.blood_respiratory_pathogen_matches}
                    disabled={!allowedEdit}
                    onChange={(e) =>
                      onChange({ ...form, blood_respiratory_pathogen_matches: e.target.checked })
                    }
                  />
                  Tác nhân máu khớp hô hấp / lung-pleural
                </label>
              ) : null}
            </div>
          )}
        </NkbvFormSection>
      )}
    </NkbvDomainFormShell>
  );
}
