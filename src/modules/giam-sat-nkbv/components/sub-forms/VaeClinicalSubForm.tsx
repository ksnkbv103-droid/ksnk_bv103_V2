"use client";


import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import React from "react";
import type { VaeVerificationData } from "../../types/nkbv-verification";

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
  activeTab?: 'VI_SINH' | 'LAM_SANG' | 'KSNK';
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
  activeTab = 'VI_SINH',
}: VaeClinicalSubFormProps) {
  // If patient age < 18, warn that VAE does not apply
  const isVaeInvalid = form.patient_age < 18;

  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Microbiology Tab */}
      {activeTab === 'VI_SINH' && (
        <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3 animate-in fade-in">
          <span className={` text-slate-500`}>🫁 Khả năng viêm phổi thở máy (PVAP vi sinh)</span>
          
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium py-1">
            <input
              type="checkbox"
              checked={form.has_purulent_sputum_and_positive_culture}
              disabled={!allowedEdit || isVaeInvalid}
              onChange={(e) => onChange({ ...form, has_purulent_sputum_and_positive_culture: e.target.checked })}
              className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Nhuộm Gram đờm mủ (&ge;25 BCĐN, &le;10 tb vảy) + cấy đờm dương tính
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium py-1">
            <input
              type="checkbox"
              checked={form.has_quantitative_culture_positive}
              disabled={!allowedEdit || isVaeInvalid}
              onChange={(e) => onChange({ ...form, has_quantitative_culture_positive: e.target.checked })}
              className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Cấy định lượng đạt ngưỡng (BAL &ge; 10⁴, ETA &ge; 10⁵ CFU/ml)
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium py-1">
            <input
              type="checkbox"
              checked={form.has_respiratory_viral_or_pathogen_test_positive}
              disabled={!allowedEdit || isVaeInvalid}
              onChange={(e) => onChange({ ...form, has_respiratory_viral_or_pathogen_test_positive: e.target.checked })}
              className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            Test virus hô hấp/Legionella (+) hoặc mô bệnh học phổi phù hợp
          </label>
        </div>
      )}

      {/* Clinical Tab */}
      {activeTab === 'LAM_SANG' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Vent Info Group */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>🔌 Thiết bị & Độ tuổi (Máy thở - Mã: BM.LS.VAE.01)</span>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tuổi bệnh nhân</label>
                <input
                  type="number"
                  value={form.patient_age}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, patient_age: parseInt(e.target.value) || 0 })}
                  className={`w-full rounded-xl bg-white px-2.5 py-2 text-xs font-semibold focus:ring-1 focus:ring-[var(--primary)] ${
                    isVaeInvalid ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[var(--primary)]"
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Ngày BẮT ĐẦU thở máy</label>
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Ngày DỪNG thở máy (nếu có)</label>
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

            {isVaeInvalid && (
              <div className="bg-red-50 text-red-800 rounded-xl p-2.5 text-[11px] font-medium border border-red-100 animate-in slide-in-from-top-2">
                ❌ Tiêu chuẩn VAE (Biến cố thở máy) chỉ áp dụng cho người lớn từ &ge; 18 tuổi thở máy liên tục từ &ge; 4 ngày. Trẻ em dưới 18 tuổi sẽ tự động chuyển sang luồng PedVAP.
              </div>
            )}

            {form.device_placed_date && !isVaeInvalid && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-xl p-2.5 text-[11px] font-medium animate-in slide-in-from-top-2">
                📊 <strong>Hệ thống tự động tính toán (CDC):</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Số ngày thở máy: <strong className="font-mono text-xs">{liveDeviceDays !== undefined ? liveDeviceDays : form.vent_days} ngày</strong> (Yêu cầu &ge; 4 ngày đối với người lớn thở máy để tính VAE)</li>
                </ul>
              </div>
            )}
          </div>

          {/* VAC Criteria */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>💨 Biến cố máy thở (VAC)</span>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-semibold py-1">
              <input
                type="checkbox"
                checked={form.has_stable_baseline_peep_fio2}
                disabled={!allowedEdit || isVaeInvalid}
                onChange={(e) => onChange({ ...form, has_stable_baseline_peep_fio2: e.target.checked })}
                className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              Có PEEP hoặc FiO2 tối thiểu ổn định hoặc giảm trong &ge; 2 ngày liên tiếp?
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.peep_increase_ge_3}
                    disabled={!allowedEdit || isVaeInvalid}
                    onChange={(e) => onChange({ ...form, peep_increase_ge_3: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)]"
                  />
                  PEEP tăng &ge; 3 cmH2O trong &ge; 2 ngày ngay sau đó?
                </label>
                {form.peep_increase_ge_3 && (
                  <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <span className="text-[11px] text-slate-400 font-bold">Ngày tăng:</span>
                    <input
                      type="date"
                      value={symptomDates.peep_increase_ge_3 || ""}
                      disabled={!allowedEdit}
                      min={iwpStart}
                      max={iwpEnd}
                      onChange={(e) => onSymptomDateChange("peep_increase_ge_3", e.target.value)}
                      className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.fio2_increase_ge_20}
                    disabled={!allowedEdit || isVaeInvalid}
                    onChange={(e) => onChange({ ...form, fio2_increase_ge_20: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)]"
                  />
                  FiO2 tăng &ge; 20% trong &ge; 2 ngày ngay sau đó?
                </label>
                {form.fio2_increase_ge_20 && (
                  <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <span className="text-[11px] text-slate-400 font-bold">Ngày tăng:</span>
                    <input
                      type="date"
                      value={symptomDates.fio2_increase_ge_20 || ""}
                      disabled={!allowedEdit}
                      min={iwpStart}
                      max={iwpEnd}
                      onChange={(e) => onSymptomDateChange("fio2_increase_ge_20", e.target.value)}
                      className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* IVAC Criteria */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>
              🧫 Triệu chứng IVAC xuất hiện trong giai đoạn từ ngày {iwpStart ? new Date(iwpStart).toLocaleDateString("vi-VN") : "X-3"} đến ngày {iwpEnd ? new Date(iwpEnd).toLocaleDateString("vi-VN") : "X+3"} (Cửa sổ lây nhiễm IWP)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.temp_fever_or_hypothermia}
                    disabled={!allowedEdit || isVaeInvalid}
                    onChange={(e) => onChange({ ...form, temp_fever_or_hypothermia: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Sốt &gt; 38°C hoặc hạ thân nhiệt &lt; 36°C
                </label>
                {form.temp_fever_or_hypothermia && (
                  <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <span className="text-[11px] text-slate-400 font-bold">Ngày:</span>
                    <input
                      type="date"
                      value={symptomDates.temp_fever_or_hypothermia || ""}
                      disabled={!allowedEdit}
                      min={iwpStart}
                      max={iwpEnd}
                      onChange={(e) => onSymptomDateChange("temp_fever_or_hypothermia", e.target.value)}
                      className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.wbc_abnormal}
                    disabled={!allowedEdit || isVaeInvalid}
                    onChange={(e) => onChange({ ...form, wbc_abnormal: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Bạch cầu &ge; 12k hoặc &lt; 4k
                </label>
                {form.wbc_abnormal && (
                  <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <span className="text-[11px] text-slate-400 font-bold">Ngày:</span>
                    <input
                      type="date"
                      value={symptomDates.wbc_abnormal || ""}
                      disabled={!allowedEdit}
                      min={iwpStart}
                      max={iwpEnd}
                      onChange={(e) => onSymptomDateChange("wbc_abnormal", e.target.value)}
                      className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                      required
                    />
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-semibold py-1 border-t border-slate-100 pt-3">
              <input
                type="checkbox"
                checked={form.new_antimicrobial_ge_4days}
                disabled={!allowedEdit || isVaeInvalid}
                onChange={(e) => onChange({ ...form, new_antimicrobial_ge_4days: e.target.checked })}
                className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              Khởi đầu kháng sinh mới lọt cửa sổ VAE và dùng liên tục &ge; 4 ngày?
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
