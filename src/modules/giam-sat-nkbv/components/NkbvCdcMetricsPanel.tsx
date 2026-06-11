"use client";

import React from "react";
import { 
  Calendar, 
  Activity, 
  RefreshCw, 
  Home, 
  MapPin, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import type { CdcMetricsResult } from "../lib/nkbv-timeline-math";
import type { DepartmentStay } from "../types/nkbv-verification";
import { subDays } from "../lib/nkbv-timeline-math";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";

interface NkbvCdcMetricsPanelProps {
  metrics: CdcMetricsResult | null;
  checklistType: "BSI" | "VAE" | "UTI" | "SSI";
  isSecondaryBsi?: boolean;
  treatmentHistory?: DepartmentStay[];
}

export default function NkbvCdcMetricsPanel({
  metrics,
  checklistType,
  isSecondaryBsi = false,
  treatmentHistory = [],
}: NkbvCdcMetricsPanelProps) {
  if (!metrics) {
    return (
      <div className={`${C.sectionGap} bg-slate-50/75 border border-slate-100 rounded-3xl p-6 text-center text-xs text-slate-400 font-medium italic animate-in fade-in duration-200`}>
        💡 Vui lòng điền Ngày phát hiện và chọn Triệu chứng để kích hoạt Bản đồ Thuật toán CDC 7 Bước động.
      </div>
    );
  }

  const formatDate = (dStr: string) => {
    if (!dStr) return "—";
    try {
      const parts = dStr.split("-");
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(dStr).toLocaleDateString("vi-VN");
    } catch {
      return dStr;
    }
  };

  // Label mappings for device based on type
  const getDeviceLabels = () => {
    switch (checklistType) {
      case "BSI":
        return { name: "CVC", term: "CLABSI", limit: 2 };
      case "UTI":
        return { name: "sonde Foley", term: "CAUTI", limit: 2 };
      case "VAE":
        return { name: "Máy thở", term: "VAP/VAE", limit: 3 };
      default:
        return { name: "Thiết bị", term: "NKBV", limit: 2 };
    }
  };

  const device = getDeviceLabels();

  return (
    <div className="bg-white rounded-3xl border border-slate-150 p-5 space-y-6 shadow-xl shadow-slate-100/50 animate-in fade-in duration-300 relative overflow-hidden">
      {/* Decorative premium glassmorphism background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)]/10 p-1.5 rounded-xl text-[var(--primary)]">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-[var(--primary)] block">Surveillance pipeline</span>
            <h4 className="text-sm font-semibold text-slate-800 tracking-tight">Bản đồ thuật toán CDC 7 bước</h4>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] text-[11px] font-medium text-slate-500">
          NHSN 2023
        </span>
      </div>

      {/* Sequential 7 Steps Diagnostic Timeline */}
      <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-5">
        
        {/* STEP 1: IWP */}
        <div className="relative group">
          <div className="absolute -left-[33px] top-0.5 bg-emerald-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-emerald-500/20 group-hover:scale-110 transition duration-200">
            1
          </div>
          <div className="space-y-1">
            <span className={` text-slate-500`}>Bước 1: Cửa sổ Nhiễm trùng (IWP)</span>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-100/70 p-2.5 rounded-[var(--radius-shell)]">
              <div>
                <span className="text-[11px] text-[11px] font-medium text-slate-500 block">Khung Cửa sổ (Ngày X ± 3):</span>
                <strong className="text-xs font-semibold font-mono text-slate-800">
                  {formatDate(metrics.iwp_start)} — {formatDate(metrics.iwp_end)}
                </strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-2 py-1 rounded-xl text-[11px] font-semibold font-mono">
                7 Ngày Lịch
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 font-semibold italic">
              💡 Dựa trên ngày xét nghiệm vi sinh dương tính vào ngày <strong className="font-mono text-slate-700">{formatDate(metrics.doe)}</strong>.
            </p>
          </div>
        </div>

        {/* STEP 2: DOE */}
        <div className="relative group">
          <div className="absolute -left-[33px] top-0.5 bg-indigo-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-indigo-500/20 group-hover:scale-110 transition duration-200">
            2
          </div>
          <div className="space-y-1">
            <span className={` text-slate-500`}>Bước 2: Điểm mốc Ngày Sự kiện (DOE)</span>
            <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100/60 p-2.5 rounded-[var(--radius-shell)]">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 block">Ngày Sự kiện quyết định:</span>
                <strong className="text-xs font-semibold font-mono text-indigo-900 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(metrics.doe)}
                </strong>
              </div>
              <div className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-lg text-[11px] font-semibold">
                MIN(Symptom, Test)
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">
              🎯 Xác định từ triệu chứng lâm sàng xuất hiện sớm nhất lọt khung IWP.
            </p>
          </div>
        </div>

        {/* STEP 3: RIT */}
        <div className="relative group">
          <div className="absolute -left-[33px] top-0.5 bg-amber-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-amber-500/20 group-hover:scale-110 transition duration-200">
            3
          </div>
          <div className="space-y-1">
            <span className={` text-slate-500`}>Bước 3: Khung Lặp lại Nhiễm khuẩn (RIT)</span>
            <div className="bg-amber-50/40 border border-amber-100/60 p-2.5 rounded-[var(--radius-shell)] flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800 block">Khung lặp lại dự kiến (DOE + 13):</span>
                <strong className="text-xs font-semibold font-mono text-amber-900">
                  {formatDate(metrics.doe)} — {formatDate(metrics.sbap_end)}
                </strong>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                14 Ngày
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 font-medium">
              ⚠️ Các chủng vi khuẩn cùng loại phát hiện trong 14 ngày này sẽ được gộp chung, không tạo thêm ca mới.
            </p>
          </div>
        </div>

        {/* STEP 4: POA vs HAI */}
        <div className="relative group">
          <div className="absolute -left-[33px] top-0.5 bg-blue-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-blue-500/20 group-hover:scale-110 transition duration-200">
            4
          </div>
          <div className="space-y-1">
            <span className={` text-slate-500`}>Bước 4: Thời gian nằm viện & Phân loại</span>
            <div className={`border p-2.5 rounded-[var(--radius-shell)] flex items-center justify-between ${
              metrics.haiStatus === "HAI" 
                ? "bg-rose-50 border-rose-100/60 text-rose-900" 
                : "bg-emerald-50 border-emerald-100/60 text-emerald-900"
            }`}>
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Thời điểm xuất hiện:</span>
                <strong className="text-xs font-semibold font-mono">
                  {metrics.haiStatus === "HAI" ? "🏥 HAI (Bệnh viện)" : "🏡 POA (Cộng đồng)"}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold block text-slate-500">Toán học:</span>
                <strong className="font-mono text-xs block">Ngày thứ {metrics.dayOfHospitalization}</strong>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 font-semibold">
              📊 Phép toán: `DOE` ({formatDate(metrics.doe)}) - `Ngày nhập viện` ({formatDate(metrics.sbap_start)}) + 1. Ngày thứ &ge; 3 quy chuẩn là HAI.
            </p>
          </div>
        </div>

        {/* STEP 5: LOA Attribution */}
        <div className="relative group">
          <div className="absolute -left-[33px] top-0.5 bg-violet-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-violet-500/20 group-hover:scale-110 transition duration-200">
            5
          </div>
          <div className="space-y-1">
            <span className={` text-slate-500`}>Bước 5: Định vị Khoa chịu lỗi (LOA) & Lịch sử nằm khoa</span>
            <div className="bg-indigo-50 border border-indigo-100/70 p-2.5 rounded-[var(--radius-shell)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[11px] font-medium text-slate-500 block">Khoa chịu trách nhiệm KPI:</span>
                <span className="bg-indigo-100 text-indigo-850 px-2 py-0.5 rounded-lg text-[11px] font-semibold font-sans shadow-sm">
                  {metrics.attributedStay?.ten_khoa || "Chưa xác định"}
                </span>
              </div>
              
              {/* Lịch sử DOE, DOE - 1 */}
              {(() => {
                const getStayAtDate = (dateStr: string) => {
                  if (!treatmentHistory || !dateStr) return null;
                  return treatmentHistory.find((s) => {
                    const v = s.ngay_vao;
                    const r = s.ngay_ra || "9999-12-31";
                    return dateStr >= v && dateStr <= r;
                  });
                };
                const doeStay = getStayAtDate(metrics.doe);
                const doeMinus1Stay = getStayAtDate(subDays(metrics.doe, 1));
                return (
                  <div className="border-t border-slate-200/50 pt-2 space-y-1 text-[11px] font-semibold text-slate-650">
                    <div className="flex justify-between">
                      <span>🏥 Khoa nằm ngày DOE ({formatDate(metrics.doe)}):</span>
                      <strong className="text-slate-800 font-bold">{doeStay?.ten_khoa || "Không rõ / POA"}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>🏥 Khoa nằm ngày DOE - 1 ({formatDate(subDays(metrics.doe, 1))}):</span>
                      <strong className="text-slate-800 font-bold">{doeMinus1Stay?.ten_khoa || "Không rõ / POA"}</strong>
                    </div>
                  </div>
                );
              })()}

              <p className="text-[11px] leading-relaxed text-indigo-750 font-semibold italic border-t border-slate-200/40 pt-1.5">
                💡 {metrics.attributionReason}
              </p>
            </div>
          </div>
        </div>

        {/* STEP 6: Device Days */}
        {checklistType !== "SSI" && (
          <div className="relative group">
            <div className="absolute -left-[33px] top-0.5 bg-pink-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-pink-500/20 group-hover:scale-110 transition duration-200">
              6
            </div>
            <div className="space-y-1">
              <span className={` text-slate-500`}>Bước 6: Quy kết Thiết bị xâm lấn ({device.name})</span>
              <div className={`border p-2.5 rounded-[var(--radius-shell)] space-y-2 ${
                metrics.device_placed_days >= (device.limit + 1) && metrics.device_active_on_event
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold block">Thời gian lưu thiết bị (đến ngày DOE):</span>
                  <strong className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                    {metrics.device_placed_days} ngày lịch
                  </strong>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200/50 pt-2">
                  <span className="text-[11px] font-bold block">Sự hiện diện tại thời điểm sự kiện:</span>
                  <strong className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                    metrics.device_active_on_event 
                      ? "bg-emerald-100 text-emerald-800" 
                      : "bg-slate-200 text-slate-800"
                  }`}>
                    {metrics.device_active_on_event ? "Hiện diện / Rút trong 24h (Đạt)" : "Không (Đã rút > 24h)"}
                  </strong>
                </div>
                
                {metrics.device_placed_days >= (device.limit + 1) && metrics.device_active_on_event ? (
                  <div className="bg-red-50/75 border border-red-100 rounded-xl p-2 text-[11px] text-red-800 font-bold flex items-center gap-1.5 animate-pulse">
                    <AlertCircle className="h-3.5 w-3.5 text-red-650 flex-shrink-0" />
                    Đạt tiêu chí liên quan thiết bị ({device.term})!
                  </div>
                ) : (
                  <div className="bg-emerald-50/75 border border-emerald-100 rounded-xl p-2 text-[11px] text-emerald-800 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-650 flex-shrink-0" />
                    Không đạt tiêu chuẩn {device.term} (Non-{device.term}).
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: Secondary BSI Check */}
        <div className="relative group">
          <div className="absolute -left-[33px] top-0.5 bg-teal-500 text-white rounded-full h-5.5 w-5.5 flex items-center justify-center text-[11px] font-semibold shadow-md shadow-teal-500/20 group-hover:scale-110 transition duration-200">
            7
          </div>
          <div className="space-y-1">
            <span className={` text-slate-500`}>Bước 7: Lọc Nhiễm khuẩn thứ phát (Secondary BSI)</span>
            
            {isSecondaryBsi ? (
              <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-[var(--radius-shell)] p-3 space-y-1 shadow-sm animate-in slide-in-from-bottom-2">
                <strong className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                  🎉 SECONDARY BSI MATCHED
                </strong>
                <p className="text-[11px] leading-relaxed text-blue-700 font-semibold">
                  Ca cấy máu này được quy kết thứ phát từ ổ nhiễm khuẩn <strong>{checklistType}</strong> trong khung thời gian SBAP. Khoa lâm sàng được miễn trừ phạt chỉ số CLABSI tiên phát!
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-150/75 text-slate-650 rounded-[var(--radius-shell)] p-2.5 text-[11px] font-semibold flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-[var(--primary)] flex-shrink-0" />
                Khảo sát BSI tiên phát độc lập. Không ghi nhận ổ nhiễm trùng thứ phát trùng tác nhân.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
