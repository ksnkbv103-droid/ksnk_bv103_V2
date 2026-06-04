"use client";

import React from "react";
import type { BsiVerificationData } from "../../types/nkbv-verification";

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
  iwpStart?: string;
  iwpEnd?: string;
  activeTab?: 'VI_SINH' | 'LAM_SANG' | 'KSNK';
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
  iwpStart,
  iwpEnd,
  activeTab = 'VI_SINH',
}: BsiClinicalSubFormProps) {
  const cleanNgayVaoVien = ngayVaoVien ? ngayVaoVien.slice(0, 10) : "";
  const cleanNgayPhatHien = ngayPhatHien ? ngayPhatHien.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Pathogen Detail Group */}
      {activeTab === 'VI_SINH' && (
        <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3 animate-in fade-in">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">✨ Thông tin vi sinh LIS (Mã: BM.VS.BSI.01)</span>
          
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tên tác nhân</label>
            <div className="relative">
              <input
                value={form.pathogen_name}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, pathogen_name: e.target.value })}
                className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                placeholder="VD: Staphylococcus aureus"
              />
              <span className="absolute right-3 top-2.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                Tự động điền LIS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Loại tác nhân</label>
              <select
                value={form.pathogen_type}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, pathogen_type: e.target.value as any })}
                className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
              >
                <option value="RECOGNIZED">Mầm bệnh đã được công nhận</option>
                <option value="COMMON_COMMENSAL">Vi khuẩn cộng sinh thông thường (da)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Tác nhân đường ruột?</label>
              <select
                value={form.is_intestinal_pathogen ? "true" : "false"}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, is_intestinal_pathogen: e.target.value === "true" })}
                className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
              >
                <option value="false">Không</option>
                <option value="true">Có (Enterococcus, Candida, E.coli...)</option>
              </select>
            </div>
          </div>

          {form.pathogen_type === "COMMON_COMMENSAL" && (
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 space-y-2 animate-in slide-in-from-top-2">
              <p className="text-[11px] text-amber-800 font-medium">
                💡 Đối với <strong>Vi khuẩn cộng sinh da</strong>, CDC yêu cầu cấy dương tính &ge; 2 lần riêng biệt và có triệu chứng lâm sàng.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-amber-700 block mb-1">Số lần cấy riêng biệt (+)</label>
                  <input
                    type="number"
                    value={form.commensal_culture_count}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, commensal_culture_count: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border-amber-200 bg-white px-2 py-1 text-xs focus:ring-amber-500 focus:border-amber-300"
                  />
                </div>
                <label className="flex items-center gap-2 text-[10px] text-amber-800 cursor-pointer pt-4 font-bold">
                  <input
                    type="checkbox"
                    checked={form.commensal_drawn_separate}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, commensal_drawn_separate: e.target.checked })}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  Lấy ở vị trí/giờ khác nhau
                </label>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-semibold pt-1">
            <input
              type="checkbox"
              checked={form.is_fungi_respiratory}
              disabled={!allowedEdit}
              onChange={(e) => onChange({ ...form, is_fungi_respiratory: e.target.checked })}
              className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
            />
            Nấm hô hấp cộng đồng (Blastomyces, Histoplasma...)?
          </label>
        </div>
      )}

      {/* Clinical / Devices / Symptoms Checklists */}
      {activeTab === 'LAM_SANG' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Catheter Device Group */}
          <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🔌 Thiết bị xâm lấn (CVC - Mã: BM.LS.BSI.01)</span>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ngày ĐẶT CVC</label>
                <input
                  type="date"
                  value={form.device_placed_date || ""}
                  disabled={!allowedEdit}
                  min={cleanNgayVaoVien || undefined}
                  max={cleanNgayPhatHien || todayStr}
                  onChange={(e) => onChange({ ...form, device_placed_date: e.target.value || undefined })}
                  className="w-full rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Ngày RÚT CVC (Để trống nếu đang lưu)</label>
                <input
                  type="date"
                  value={form.device_removed_date || ""}
                  disabled={!allowedEdit}
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
                  <li>Thời gian đặt CVC: <strong className="font-mono text-xs">{liveDeviceDays !== undefined ? liveDeviceDays : form.cvc_placed_days} ngày</strong> (Yêu cầu &gt; 2 ngày để chẩn đoán CLABSI)</li>
                  <li>Trạng thái CVC ngày sự kiện: <strong className="font-mono text-xs">{(liveDeviceActive !== undefined ? liveDeviceActive : form.cvc_active_on_event) ? "Đang lưu / Mới rút trong 24h (Đạt)" : "Đã rút trên 24h (Không đạt CLABSI)"}</strong></li>
                </ul>
              </div>
            )}
          </div>

          {/* Clinical Symptoms */}
          <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              🏥 Các triệu chứng xuất hiện trong giai đoạn từ ngày {iwpStart ? new Date(iwpStart).toLocaleDateString("vi-VN") : "X-3"} đến ngày {iwpEnd ? new Date(iwpEnd).toLocaleDateString("vi-VN") : "X+3"} (Cửa sổ lây nhiễm IWP)
            </span>

            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-semibold py-1">
                <input
                  type="checkbox"
                  checked={form.symptoms_window_7days}
                  disabled={!allowedEdit}
                  onChange={(e) => onChange({ ...form, symptoms_window_7days: e.target.checked })}
                  className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
                />
                Sốt &gt; 38°C, rét run, hoặc hạ huyết áp trong vòng 7 ngày?
              </label>
              {form.symptoms_window_7days && (
                <div className="pl-6 flex items-center gap-2 animate-in slide-in-from-top-1">
                  <span className="text-[10px] text-slate-400 font-bold">Ngày khởi phát:</span>
                  <input
                    type="date"
                    value={symptomDates.symptoms_window_7days || ""}
                    disabled={!allowedEdit}
                    min={iwpStart || undefined}
                    max={iwpEnd || undefined}
                    onChange={(e) => onSymptomDateChange("symptoms_window_7days", e.target.value)}
                    className="rounded-lg border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:border-[#026f17] focus:ring-1 focus:ring-[#026f17]"
                    required
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-semibold py-1 border-t border-slate-100 pt-3">
              <input
                type="checkbox"
                checked={form.is_neutropenia}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, is_neutropenia: e.target.checked })}
                className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
              />
              Ghép tế bào gốc hoặc bạch cầu hạt nặng (ANC &lt; 500)?
            </label>
          </div>

          {/* Localized Exclusions */}
          <div className="bg-slate-50/75 rounded-2xl p-4 border border-slate-100 space-y-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">🔄 Lọc nhiễm trùng thứ phát (Secondary BSI)</span>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer font-semibold py-1">
              <input
                type="checkbox"
                checked={form.has_localized_infection}
                disabled={!allowedEdit}
                onChange={(e) => onChange({ ...form, has_localized_infection: e.target.checked })}
                className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
              />
              Có ổ nhiễm trùng tại chỗ khác đạt chuẩn CDC (VAP, UTI, SSI...)?
            </label>

            {form.has_localized_infection && (
              <div className="bg-[#026f17]/5 rounded-xl p-3 border border-[#026f17]/10 space-y-2.5 animate-in slide-in-from-top-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.localized_pathogen_matches}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, localized_pathogen_matches: e.target.checked })}
                    className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
                  />
                  Vi khuẩn trong máu trùng với vi khuẩn tại ổ nhiễm trùng chỗ kia?
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.is_in_sbap_window}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, is_in_sbap_window: e.target.checked })}
                    className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
                  />
                  Mẫu cấy máu lấy trong khung SBAP 14 ngày của ca bệnh tại chỗ?
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={form.blood_mandatory_for_localized}
                    disabled={!allowedEdit}
                    onChange={(e) => onChange({ ...form, blood_mandatory_for_localized: e.target.checked })}
                    className="rounded border-slate-300 text-[#026f17] focus:ring-[#026f17]"
                  />
                  Cấy máu dương tính là tiêu chuẩn bắt buộc cho ổ nhiễm trùng kia?
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
