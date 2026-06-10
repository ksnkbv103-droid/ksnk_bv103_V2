"use client";


import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import React from "react";
import type { VaeVerificationData } from "../../types/nkbv-verification";

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
  activeTab?: 'VI_SINH' | 'LAM_SANG' | 'KSNK';
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
  activeTab = 'VI_SINH',
}: PneuClinicalSubFormProps) {
  return (
    <div className="space-y-4">
      {/* Microbiology Tab */}
      {activeTab === 'VI_SINH' && (
        <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3 animate-in fade-in">
          <span className={` text-slate-500`}>🧫 Nâng cấp bằng chứng vi sinh (BSI & CDC Classification)</span>
          
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Phân cấp bằng chứng nuôi cấy</label>
            <select
              value={form.microbiology_evidence}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, microbiology_evidence: e.target.value as any })}
              className={C.controlInput}
            >
              <option value="NONE">Không cấy / Chỉ chẩn đoán PNU1 (Viêm phổi lâm sàng)</option>
              <option value="PNU2">PNU2 (Cấy đặc hiệu vi khuẩn/test virus hô hấp)</option>
              <option value="PNU3">PNU3 (Bằng chứng nấm/tác nhân trên bệnh nhân suy giảm miễn dịch)</option>
            </select>
          </div>
        </div>
      )}

      {/* Clinical Tab */}
      {activeTab === 'LAM_SANG' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Chest Imaging Group */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>📸 Chẩn đoán hình ảnh (Mã: BM.LS.PNEU.01)</span>
            
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold">
                <input
                  type="checkbox"
                  checked={form.has_chest_imaging_abnormal}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, has_chest_imaging_abnormal: e.target.checked })}
                  className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                X-quang hoặc CT phổi có tổn thương thâm nhiễm mới/đông đặc/tạo hang?
              </label>
              {form.has_chest_imaging_abnormal && (
                <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                  <span className="text-[11px] text-slate-400 font-bold">Ngày thâm nhiễm:</span>
                  <input
                    type="date"
                    value={symptomDates.has_chest_imaging_abnormal || ""}
                    disabled={!allowedEdit}
                    min={iwpStart}
                    max={iwpEnd}
                    onChange={(e) => onSymptomDateChange("has_chest_imaging_abnormal", e.target.value)}
                    className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                    required
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100/60">
              <div>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold pt-1">
                  <input
                    type="checkbox"
                    checked={form.has_cardiopulmonary_disease_underlying}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, has_cardiopulmonary_disease_underlying: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Bệnh nhân có bệnh nền tim phổi (suy tim, COPD, ARDS)?
                </label>
                {form.has_cardiopulmonary_disease_underlying && (
                  <span className="text-[11px] text-amber-700 font-medium block mt-1">
                    💡 CDC yêu cầu &ge; 2 phim bất thường ở các ngày khác nhau đối với bệnh nhân có bệnh nền.
                  </span>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Số lượng phim bất thường</label>
                <input
                  type="number"
                  value={form.imaging_films_count}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, imaging_films_count: parseInt(e.target.value) || 0 })}
                  className={C.controlInput}
                />
              </div>
            </div>
          </div>

          {/* Clinical Symptoms */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>
              🏥 Các triệu chứng xuất hiện trong giai đoạn từ ngày {iwpStart ? new Date(iwpStart).toLocaleDateString("vi-VN") : "X-3"} đến ngày {iwpEnd ? new Date(iwpEnd).toLocaleDateString("vi-VN") : "X+3"} (Cửa sổ lây nhiễm IWP)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">1. Dấu hiệu toàn thân (Cần &ge; 1)</span>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={form.fever_or_wbc_abnormal}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, fever_or_wbc_abnormal: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Sốt &gt; 38°C, hạ thân nhiệt &lt; 36°C, hoặc Bạch cầu bất thường
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={form.altered_mental_status_ge_70yo}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, altered_mental_status_ge_70yo: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Thay đổi ý thức/lú lẫn (chỉ tính ở người &ge; 70 tuổi)
                </label>
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">2. Số triệu chứng tại chỗ (Cần &ge; 2)</span>
                <input
                  type="number"
                  value={form.respiratory_symptoms_count}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, respiratory_symptoms_count: parseInt(e.target.value) || 0 })}
                  className={C.controlInput}
                  placeholder="Ho mới, khó thở, rale phổi..."
                />
                <span className="text-[11px] text-slate-400 block mt-1 italic">Triệu chứng: đờm mủ mới/tăng đờm, ho, khó thở, rale phổi, khí máu giảm.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
