"use client";

import React from "react";
import type { UtiVerificationData } from "../../types/nkbv-verification";

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
  activeTab?: 'VI_SINH' | 'LAM_SANG' | 'KSNK';
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
  activeTab = 'VI_SINH',
}: UtiClinicalSubFormProps) {
  // If mixed flora (pathogen count > 2) or fungi yeast parasite are true, warn and restrict
  const isMicrobiologyBlocked = form.pathogen_count > 2 || form.has_fungi_yeast_parasite;

  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Urine Culture Group */}
      {activeTab === 'VI_SINH' && (
        <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3 animate-in fade-in">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">✨ Kết quả cấy nước tiểu (Mã: BM.VS.UTI.01)</span>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số lượng vi khuẩn (CFU/ml)</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.urine_cfu_count}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, urine_cfu_count: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                />
                <span className="absolute right-3 top-2.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  LIS
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số chủng vi sinh vật mọc</label>
              <input
                type="number"
                value={form.pathogen_count}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, pathogen_count: parseInt(e.target.value) || 1 })}
                className={`w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-[#026f17] ${
                  form.pathogen_count > 2 ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#026f17]"
                }`}
              />
            </div>
          </div>

          {form.pathogen_count > 2 && (
            <div className="bg-red-50 text-red-800 rounded-xl p-2.5 text-[11px] font-medium border border-red-100 animate-in slide-in-from-top-2">
              ❌ CDC nghiêm cấm chẩn đoán CAUTI/UTI khi có &gt; 2 chủng vi sinh mọc (Tạp nhiễm). Ca này sẽ tự động bị loại bỏ.
            </div>
          )}

          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-bold py-1 text-amber-700">
            <input
              type="checkbox"
              checked={form.has_fungi_yeast_parasite}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, has_fungi_yeast_parasite: e.target.checked })}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            ⚠️ Có chứa nấm Candida / nấm men / ký sinh trùng?
          </label>
          
          {form.has_fungi_yeast_parasite && (
            <div className="bg-red-55 text-red-800 rounded-xl p-2.5 text-[11px] font-medium border border-red-100 animate-in slide-in-from-top-2">
              ❌ CDC/NHSN cấm tuyệt đối sử dụng Nấm (Candida) hoặc ký sinh trùng để chẩn đoán UTI/CAUTI. Ca bệnh này sẽ tự động bị loại trừ khỏi chỉ số.
            </div>
          )}
        </div>
      )}

      {/* Foley Device Group & Checklist Symptoms */}
      {activeTab === 'LAM_SANG' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Foley Device Group */}
          <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🔌 Thiết bị xâm lấn (Sonde Foley - Mã: BM.LS.UTI.01)</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ngày ĐẶT Sonde Foley</label>
                <input
                  type="date"
                  value={form.device_placed_date || ""}
                  disabled={!allowedEdit || isMicrobiologyBlocked}
                  min={cleanNgayVaoVien || undefined}
                  max={cleanNgayPhatHien || todayStr}
                  onChange={(e) => onChange({ ...form, device_placed_date: e.target.value || undefined })}
                  className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ngày RÚT Sonde Foley (Để trống nếu đang lưu)</label>
                <input
                  type="date"
                  value={form.device_removed_date || ""}
                  disabled={!allowedEdit || isMicrobiologyBlocked}
                  min={form.device_placed_date || cleanNgayVaoVien || undefined}
                  max={todayStr}
                  onChange={(e) => onChange({ ...form, device_removed_date: e.target.value || undefined })}
                  className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                />
              </div>
            </div>

            {form.device_placed_date && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-900 rounded-xl p-2.5 text-[11px] font-medium animate-in slide-in-from-top-2">
                📊 <strong>Hệ thống tự động tính toán (CDC):</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Thời gian đặt Foley: <strong className="font-mono text-xs">{liveDeviceDays !== undefined ? liveDeviceDays : form.foley_placed_days} ngày</strong> (Yêu cầu &gt; 2 ngày để chẩn đoán CAUTI)</li>
                  <li>Trạng thái Foley ngày sự kiện: <strong className="font-mono text-xs">{(liveDeviceActive !== undefined ? liveDeviceActive : form.foley_active_on_event) ? "Đang lưu / Mới rút trong 24h (Đạt)" : "Đã rút trên 24h (Không đạt CAUTI)"}</strong></li>
                </ul>
              </div>
            )}
          </div>

          {/* UTI symptoms */}
          <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              🏥 Các triệu chứng xuất hiện trong giai đoạn từ ngày {iwpStart ? new Date(iwpStart).toLocaleDateString("vi-VN") : "X-3"} đến ngày {iwpEnd ? new Date(iwpEnd).toLocaleDateString("vi-VN") : "X+3"} (Cửa sổ lây nhiễm IWP)
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { key: "has_fever", label: "Sốt > 38°C" },
                { key: "has_suprapubic_tenderness", label: "Đau tức trên xương mu" },
                { key: "has_costovertebral_pain", label: "Đau hố thắt lưng" },
                { key: "has_dysuria", label: "Tiểu buốt / Tiểu rắt / Tiểu gấp" },
              ].map(({ key, label }) => {
                // Tự động ẩn triệu chứng buốt/rắt/gấp nếu đang đặt Foley (theo quy định CDC và NKTN thuật toán)
                const isSymptomHidden = form.foley_active_on_event && key === "has_dysuria";
                if (isSymptomHidden) return null;

                const isChecked = !!form[key as keyof UtiVerificationData];

                return (
                  <div key={key} className="flex flex-col gap-1.5 border border-slate-100 p-2 rounded-xl bg-white/50">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!allowedEdit || isMicrobiologyBlocked}
                        onChange={(e) => onChange({ ...form, [key]: e.target.checked })}
                        className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
                      />
                      {label}
                    </label>
                    {isChecked && (
                      <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                        <span className="text-[10px] text-slate-400 font-bold">Ngày:</span>
                        <input
                          type="date"
                          value={symptomDates[key] || ""}
                          disabled={!allowedEdit || isMicrobiologyBlocked}
                          min={iwpStart || undefined}
                          max={iwpEnd || undefined}
                          onChange={(e) => onSymptomDateChange(key, e.target.value)}
                          className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Asymptomatic Bacteriuria (ABUTI) */}
          <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🔄 Ngoại lệ Cấy máu trùng khớp (ABUTI)</span>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-semibold py-1">
              <input
                type="checkbox"
                checked={form.has_blood_culture_positive_in_window}
                disabled={!allowedEdit || isMicrobiologyBlocked}
                onChange={(e) => onChange({ ...form, has_blood_culture_positive_in_window: e.target.checked })}
                className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
              />
              Có cấy máu dương tính trong khung 7 ngày?
            </label>

            {form.has_blood_culture_positive_in_window && (
              <div className="flex flex-col gap-2.5 pl-6 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold">Ngày cấy máu:</span>
                  <input
                    type="date"
                    value={symptomDates.has_blood_culture_positive_in_window || ""}
                    disabled={!allowedEdit || isMicrobiologyBlocked}
                    min={iwpStart || undefined}
                    max={iwpEnd || undefined}
                    onChange={(e) => onSymptomDateChange("has_blood_culture_positive_in_window", e.target.value)}
                    className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold">
                  <input
                    type="checkbox"
                    checked={form.blood_urine_pathogen_matches}
                    disabled={!allowedEdit || isMicrobiologyBlocked}
                    onChange={(e) => onChange({ ...form, blood_urine_pathogen_matches: e.target.checked })}
                    className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
                  />
                  Tác nhân cấy máu trùng tác nhân cấy nước tiểu &ge; 10⁵ CFU/ml?
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
