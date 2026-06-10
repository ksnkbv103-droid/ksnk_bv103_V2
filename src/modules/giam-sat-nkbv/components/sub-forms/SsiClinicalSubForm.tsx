"use client";

import { nkbvFormChrome as C } from "../../lib/nkbv-form-chrome";
import React from "react";
import type { SsiVerificationData } from "../../types/nkbv-verification";

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
  activeTab?: 'VI_SINH' | 'LAM_SANG' | 'KSNK';
}

export default function SsiClinicalSubForm({
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
}: SsiClinicalSubFormProps) {
  const limitDays = form.has_implant ? 90 : 30;
  const isTimeframeExpired = form.days_since_surgery > limitDays;

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-shell)] border border-emerald-100 bg-emerald-50/60 p-4 space-y-2">
        <label className={`${C.formLabel} text-emerald-800`}>Mã QR bộ dụng cụ CSSD (truy vết SSI)</label>
        <input
          type="text"
          value={form.ma_qr_cssd_lien_quan || ""}
          disabled={!allowedEdit}
          onChange={(e) => onChange({ ...form, ma_qr_cssd_lien_quan: e.target.value.toUpperCase() })}
          placeholder="Quét hoặc nhập mã QR chu trình..."
          className={C.controlInput}
        />
        <p className="text-[11px] text-emerald-900/80 font-medium">
          Sau khi lưu checklist, hệ thống liên kết ca với timeline CSSD (tab Truy vết).
        </p>
      </div>

      {/* Microbiology Tab */}
      {activeTab === 'VI_SINH' && (
        <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3 animate-in fade-in">
          <span className={` text-slate-500`}>🧫 Kết quả vi sinh vết mổ</span>
          
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold py-1">
            <input
              type="checkbox"
              checked={form.superficial_culture_positive}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, superficial_culture_positive: e.target.checked })}
              className="rounded border-slate-300 text-[var(--primary)]"
            />
            Cấy dịch/mô lấy vô khuẩn từ vết mổ nông dương tính
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold py-1">
            <input
              type="checkbox"
              checked={form.organ_space_culture_positive}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, organ_space_culture_positive: e.target.checked })}
              className="rounded border-slate-300 text-[var(--primary)]"
            />
            Cấy dịch/mô lấy vô khuẩn từ organ/space dương tính
          </label>
          
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <span className={` text-slate-500`}>🔄 Biến chứng cấy máu kèm theo (Secondary BSI)</span>
            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-bold py-1">
              <input
                type="checkbox"
                checked={form.has_blood_culture_positive}
                disabled={!allowedEdit || isTimeframeExpired}
                onChange={(e) => onChange({ ...form, has_blood_culture_positive: e.target.checked })}
                className="rounded border-slate-300 text-[var(--primary)]"
              />
              Có cấy máu dương tính
            </label>
            {form.has_blood_culture_positive && (
              <div className="flex flex-col gap-2 pl-6 animate-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-bold">Ngày cấy máu:</span>
                  <input
                    type="date"
                    value={symptomDates.has_blood_culture_positive || ""}
                    disabled={!allowedEdit}
                    min={iwpStart}
                    max={iwpEnd}
                    onChange={(e) => onSymptomDateChange("has_blood_culture_positive", e.target.value)}
                    className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                    required
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={form.blood_ssi_pathogen_matches}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, blood_ssi_pathogen_matches: e.target.checked })}
                    className="rounded border-slate-300 text-[var(--primary)]"
                  />
                  Trùng tác nhân cấy vết mổ
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clinical Tab */}
      {activeTab === 'LAM_SANG' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Surgical Details Group */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>✂️ Thông tin phẫu thuật (Mã: BM.LS.SSI.01)</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Loại phẫu thuật NHSN</label>
                <input
                  value={form.loai_phau_thuat_nhsn}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, loai_phau_thuat_nhsn: e.target.value })}
                  className={C.controlInput}
                  placeholder="VD: COLO, HPRO..."
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Số ngày sau mổ (Days to Event)</label>
                <input
                  type="number"
                  value={form.days_since_surgery}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, days_since_surgery: parseInt(e.target.value) || 0 })}
                  className={`w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[var(--primary)] ${
                    isTimeframeExpired ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[var(--primary)]"
                  }`}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-bold py-1">
              <input
                type="checkbox"
                checked={form.has_implant}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, has_implant: e.target.checked })}
                className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              Phẫu thuật có đặt vật liệu nhân tạo (Implant) cấy ghép?
            </label>

            {isTimeframeExpired && (
              <div className="bg-red-50 text-red-800 rounded-xl p-2.5 text-[11px] font-medium border border-red-100 animate-in slide-in-from-top-2">
                ⚠️ Đã vượt quá thời hiệu giám sát tối đa ({limitDays} ngày đối với phẫu thuật {form.has_implant ? "có implant" : "không implant"}). Hệ thống sẽ tự động loại bỏ ca này khỏi thống kê SSI.
              </div>
            )}
          </div>

          {/* Depth selection & symptoms checklist */}
          <div className="bg-slate-50/75 rounded-[var(--radius-shell)] p-4 border border-slate-100 space-y-3">
            <span className={` text-slate-500`}>
              🏥 Đánh giá triệu chứng lâm sàng vết mổ
            </span>
            
            <select
              value={form.ssi_depth}
              disabled={!allowedEdit || isTimeframeExpired}
              onChange={(e) => onChange({ ...form, ssi_depth: e.target.value as any })}
              className={`${C.controlInput} mb-2`}
            >
              <option value="NONE">Chưa xác định độ sâu</option>
              <option value="SUPERFICIAL">Nông (Vết rạch nông - da/dưới da)</option>
              <option value="DEEP">Sâu (Vết mổ sâu - cân/cơ)</option>
              <option value="ORGAN_SPACE">Khoang/Cơ quan (Vùng cơ quan thao tác phẫu thuật)</option>
            </select>

            {/* Dynamic checklist elements based on depth */}
            {form.ssi_depth === "SUPERFICIAL" && (
              <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                <span className="text-[11px] font-medium text-slate-400 block border-b border-slate-100 pb-1">Tiêu chí vết mổ Nông</span>
                {[
                  { key: "superficial_purulent_drainage", label: "Có chảy mủ từ vết rạch nông" },
                  { key: "superficial_culture_positive", label: "Cấy dịch/mô lấy vô khuẩn từ vết mổ nông dương tính" },
                  { key: "superficial_opened_with_inflammation", label: "PT viên mở vết nông + BN bị sưng/nóng/đỏ/đau" },
                  { key: "superficial_physician_diagnosis", label: "Bác sĩ trực tiếp chẩn đoán là SSI nông" }
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={(form as any)[key] || false}
                        disabled={!allowedEdit}
                        onChange={(e) => onChange({ ...form, [key]: e.target.checked })}
                        className="rounded border-slate-300 text-[var(--primary)]"
                      />
                      {label}
                    </label>
                    {(form as any)[key] && (
                      <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                        <span className="text-[11px] text-slate-400 font-bold">Ngày:</span>
                        <input
                          type="date"
                          value={symptomDates[key] || ""}
                          disabled={!allowedEdit}
                          min={iwpStart}
                          max={iwpEnd}
                          onChange={(e) => onSymptomDateChange(key, e.target.value)}
                          className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {form.ssi_depth === "DEEP" && (
              <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                <span className="text-[11px] font-medium text-slate-400 block border-b border-slate-100 pb-1">Tiêu chí vết mổ Sâu</span>
                {[
                  { key: "deep_purulent_drainage", label: "Chảy mủ từ vết rạch sâu" },
                  { key: "deep_dehisced_or_opened_with_symptoms", label: "Vết mổ tự toác/mở sâu + bệnh nhân sốt > 38°C hoặc đau tại chỗ" },
                  { key: "deep_abscess_imaging_pathology", label: "Phát hiện ổ áp xe/nhiễm khuẩn mô sâu qua mổ lại, CĐHA, hoặc giải phẫu bệnh" }
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={(form as any)[key] || false}
                        disabled={!allowedEdit}
                        onChange={(e) => onChange({ ...form, [key]: e.target.checked })}
                        className="rounded border-slate-300 text-[var(--primary)]"
                      />
                      {label}
                    </label>
                    {(form as any)[key] && (
                      <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                        <span className="text-[11px] text-slate-400 font-bold">Ngày:</span>
                        <input
                          type="date"
                          value={symptomDates[key] || ""}
                          disabled={!allowedEdit}
                          min={iwpStart}
                          max={iwpEnd}
                          onChange={(e) => onSymptomDateChange(key, e.target.value)}
                          className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {form.ssi_depth === "ORGAN_SPACE" && (
              <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-2.5 animate-in fade-in duration-200">
                <span className="text-[11px] font-medium text-slate-400 block border-b border-slate-100 pb-1">Tiêu chí vết mổ Cơ quan/Khoang</span>
                {[
                  { key: "organ_space_purulent_drainage", label: "Có chảy mủ từ dẫn lưu organ/space" },
                  { key: "organ_space_culture_positive", label: "Cấy dịch/mô lấy vô khuẩn từ organ/space dương tính" },
                  { key: "organ_space_abscess_imaging_pathology", label: "Phát hiện áp xe trong organ/space qua mổ lại, CĐHA, hoặc giải phẫu bệnh" }
                ].map(({ key, label }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={(form as any)[key] || false}
                        disabled={!allowedEdit}
                        onChange={(e) => onChange({ ...form, [key]: e.target.checked })}
                        className="rounded border-slate-300 text-[var(--primary)]"
                      />
                      {label}
                    </label>
                    {(form as any)[key] && (
                      <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                        <span className="text-[11px] text-slate-400 font-bold">Ngày:</span>
                        <input
                          type="date"
                          value={symptomDates[key] || ""}
                          disabled={!allowedEdit}
                          min={iwpStart}
                          max={iwpEnd}
                          onChange={(e) => onSymptomDateChange(key, e.target.value)}
                          className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
