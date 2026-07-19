"use client";

import React from "react";
import { X, HelpCircle, FileText, Ban } from "lucide-react";
import BsiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/BsiClinicalSubForm";
import UtiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/UtiClinicalSubForm";
import PneuClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/PneuClinicalSubForm";
import VaeClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/VaeClinicalSubForm";
import SsiClinicalSubForm from "@/modules/giam-sat-nkbv/components/sub-forms/SsiClinicalSubForm";
import NkbvStayHistoryTable from "@/modules/giam-sat-nkbv/components/NkbvStayHistoryTable";
import NkbvCssdRcaPanel from "@/modules/giam-sat-nkbv/components/NkbvCssdRcaPanel";
import NkbvChecklistKsnkTab from "@/modules/giam-sat-nkbv/components/NkbvChecklistKsnkTab";
import { nkbvFormChrome as C } from "../lib/nkbv-form-chrome";
import { useNkbvChecklistModalState } from "./useNkbvChecklistModalState";
import {
  formatNkbvChecklistTypeLabel,
  NKBV_CHECKLIST_TYPE_PICKER_LABELS,
  type NkbvChecklistTypeCode,
} from "../lib/nkbv-loai-labels";

export type NkbvClinicalChecklistModalProps = {
  row: Record<string, any>;
  onClose: () => void;
  onSuccess: () => void;
  allowedEdit: boolean;
  khoas?: Array<{ id: string; ten_danh_muc: string }>;
};

export default function NkbvClinicalChecklistModal({
  row,
  onClose,
  onSuccess,
  allowedEdit,
  khoas = [],
}: NkbvClinicalChecklistModalProps) {
  const {
    submitting,
    adjudicating,
    activeTab,
    simulatedRole,
    handleTabChange,
    treatmentHistory,
    symptomDates,
    setSymptomDates,
    suggestedType,
    suspectedType,
    setSuspectedType,
    checklistType,
    clinicalPathway,
    bsiForm,
    setBsiForm,
    vaeForm,
    setVaeForm,
    utiForm,
    setUtiForm,
    ssiForm,
    setSsiForm,
    handleAddStay,
    handleDeleteStay,
    liveCdcMetrics,
    liveEvaluation,
    handleSaveChecklist,
    handleAdjudicate,
  } = useNkbvChecklistModalState({ row, onClose, onSuccess, allowedEdit });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-5xl rounded-[var(--radius-shell)] border border-slate-100 bg-white p-6 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-slate-50 transition"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title & Case Header Summary */}
        <div className="border-b border-slate-100 pb-4 pr-10">
          <div className="flex items-center gap-2">
            <h2 className={`${C.modalTitle} flex items-center gap-1.5`}>
              <FileText className="h-6 w-6 text-[var(--primary)]" />
              Thẩm định triệu chứng lâm sàng (CDC/NHSN 2023)
            </h2>
            <span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 font-mono text-[11px] font-medium text-[var(--primary)]">
              {formatNkbvChecklistTypeLabel(checklistType)}
            </span>
          </div>

          {/* Quick patient data banner */}
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1.5 text-xs bg-slate-50 rounded-[var(--radius-shell)] p-3 border border-slate-100">
            <div>
              <span className={`block `}>Mã ca / Mã BN</span>
              <strong className="text-slate-800">{String(row.ma_ca || "")}</strong> / <strong className="text-slate-600">{String(row.ma_benh_nhan || "—")}</strong>
            </div>
            <div>
              <span className={`block `}>Họ tên bệnh nhân</span>
              <strong className="text-slate-800">{String(row.ho_ten_benh_nhan || "—")}</strong>
              <span className="text-[11px] text-slate-400"> {row.gioi_tinh ? `(${row.gioi_tinh})` : ""}</span>
            </div>
            <div>
              <span className={`block `}>Ngày phát hiện (LIS Culture)</span>
              <strong className="text-slate-800">{row.ngay_phat_hien ? new Date(row.ngay_phat_hien).toLocaleDateString("vi-VN") : "—"}</strong>
            </div>
            <div>
              <span className={`block `}>Cấy vi sinh dương tính</span>
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 font-mono italic">
                {String(row.tac_nhan_vi_khuan || "Chưa xác định")}
              </span>
            </div>
          </div>

          {checklistType === "SSI" ||
          (row as { ma_cycle_qr_lien_quan?: string }).ma_cycle_qr_lien_quan ||
          (row as { quy_trinh_id?: string }).quy_trinh_id ? (
            <NkbvCssdRcaPanel
              maQr={(row as { ma_cycle_qr_lien_quan?: string }).ma_cycle_qr_lien_quan}
              quyTrinhId={(row as { quy_trinh_id?: string }).quy_trinh_id}
              showEmptyHint={checklistType === "SSI"}
            />
          ) : null}

          {/* Role-based Workflow Tabs Header */}
          <div className="mt-4 border-b border-slate-100 flex gap-1 bg-slate-50 rounded-[var(--radius-shell)] p-1 border border-slate-200">
            {[
              { id: 'VI_SINH', label: '🔬 1. KHOA VI SINH', desc: 'Copy LIS, cấy nấm, CFU...' },
              { id: 'LAM_SANG', label: '🥼 2. KHOA LÂM SÀNG', desc: 'Đặt sonde, history, triệu chứng...' },
              { id: 'KSNK', label: '👥 3. PHÁN QUYẾT KSNK', desc: 'Timeline, thẩm định, chốt ca...' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex-1 text-left pb-2 pt-1.5 px-4 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-[var(--primary)] text-white font-black shadow-md shadow-[var(--primary)]/25'
                    : 'text-slate-655 hover:text-slate-800 hover:bg-white'
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide">{tab.label}</div>
                <div className={`text-[11px] font-bold mt-0.5 ${activeTab === tab.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {tab.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Clinical Suspected Infection Selector (Phán quyết mẫu cấy) */}
          <div className="mt-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-[var(--radius-shell)] p-3.5 space-y-2.5 shadow-sm shadow-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className={`${C.blockSection} flex items-center gap-1.5 text-[var(--primary)]`}>
                <HelpCircle className="h-4 w-4 text-[var(--primary)]" />
                Phán quyết dịch tễ: Xác định loại nhiễm khuẩn nghi ngờ
              </span>
              <span className="text-[11px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full">
                💡 Gợi ý hệ thống: {formatNkbvChecklistTypeLabel(suggestedType)}
              </span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {(
                [
                  { id: "UTI" as const, color: "border-blue-200 hover:bg-blue-50/50 text-blue-900 bg-blue-50/10" },
                  { id: "VAE" as const, color: "border-purple-200 hover:bg-purple-50/50 text-purple-900 bg-purple-50/10" },
                  { id: "VAP" as const, color: "border-fuchsia-200 hover:bg-fuchsia-50/50 text-fuchsia-900 bg-fuchsia-50/10" },
                  { id: "HAP" as const, color: "border-indigo-200 hover:bg-indigo-50/50 text-indigo-900 bg-indigo-50/10" },
                  { id: "BSI" as const, color: "border-rose-200 hover:bg-rose-50/50 text-rose-900 bg-rose-50/10" },
                  { id: "SSI" as const, color: "border-amber-200 hover:bg-amber-50/50 text-amber-900 bg-amber-50/10" },
                  { id: "LOAI_TRU" as const, color: "border-slate-200 hover:bg-slate-50/50 text-slate-900 bg-slate-50/10" },
                ] satisfies Array<{ id: NkbvChecklistTypeCode; color: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!allowedEdit || simulatedRole === "VI_SINH"}
                  onClick={() => setSuspectedType(item.id)}
                  className={`border rounded-xl py-2 px-1 text-[11px] font-bold tracking-tight text-center transition-all duration-200 ${
                    suspectedType === item.id
                      ? "border-[var(--primary)] bg-white text-[var(--primary)] font-black shadow-sm ring-2 ring-emerald-500/10 scale-[1.02]"
                      : `${item.color} opacity-80 hover:opacity-100`
                  }`}
                >
                  {NKBV_CHECKLIST_TYPE_PICKER_LABELS[item.id]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Body Content based on Tabs */}
        <div className="flex-1 overflow-y-auto py-4 pr-1">
          
          {/* TAB 1: KHOA VI SINH */}
          {activeTab === 'VI_SINH' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-3xl flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-[var(--primary)] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className={C.sectionTitle}>Yêu cầu đối với Khoa Vi Sinh</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed font-semibold">
                    Nhập kết quả cấy vi sinh từ LIS hoặc Dropdown. Hệ thống sẽ tự động lọc bỏ nấm Candida (đối với UTI) và mẫu cấy bị tạp nhiễm &gt; 2 chủng trước khi cho phép lâm sàng nhập liệu.
                  </p>
                </div>
              </div>

              <div className="max-w-3xl mx-auto space-y-4">
                {suspectedType === "LOAI_TRU" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-2">
                    <Ban className="h-10 w-10 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-semibold text-slate-700">CA BỆNH ĐÃ ĐƯỢC CHỌN LOẠI TRỪ VÌ KHÔNG ĐẠT TIÊU CHUẨN NKBV</h4>
                  </div>
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "BSI" && bsiForm && (
                  <BsiClinicalSubForm
                    form={bsiForm}
                    onChange={setBsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="VI_SINH"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && clinicalPathway === "VAE" && vaeForm && (
                  <VaeClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                        liveDeviceDays={liveCdcMetrics?.device_placed_days}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="VI_SINH"
                      />
                )}

                {suspectedType !== "LOAI_TRU" && clinicalPathway === "PNEU" && vaeForm && (
                      <PneuClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="VI_SINH"
                      />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "UTI" && utiForm && (
                  <UtiClinicalSubForm
                    form={utiForm}
                    onChange={setUtiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="VI_SINH"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "SSI" && ssiForm && (
                  <SsiClinicalSubForm
                    form={ssiForm}
                    onChange={setSsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'VI_SINH' || simulatedRole === 'KSNK')}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="VI_SINH"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: KHOA LÂM SÀNG */}
          {activeTab === 'LAM_SANG' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
              {/* Left Part: Stay history (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <span className={` text-slate-500`}>🏥 Lịch sử chuyển khoa điều trị (LOA/POA)</span>
                <NkbvStayHistoryTable
                  treatmentHistory={treatmentHistory}
                  onAddStay={handleAddStay}
                  onDeleteStay={handleDeleteStay}
                  khoas={khoas}
                  allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                  ngayVaoVien={row.ngay_vao_vien}
                  ngayPhatHien={row.ngay_phat_hien}
                />
              </div>

              {/* Right Part: Device & Symptoms Checklist (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <span className={` text-slate-500`}>🥼 Khai báo triệu chứng & Thiết bị</span>
                
                {suspectedType === "LOAI_TRU" && (
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-2">
                    <Ban className="h-10 w-10 text-slate-400 mx-auto animate-pulse" />
                    <h4 className="text-xs font-semibold text-slate-700">ĐÃ CHỌN PHÁN QUYẾT LOẠI TRỪ</h4>
                  </div>
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "BSI" && bsiForm && (
                  <BsiClinicalSubForm
                    form={bsiForm}
                    onChange={setBsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="LAM_SANG"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && clinicalPathway === "VAE" && vaeForm && (
                      <VaeClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                        liveDeviceDays={liveCdcMetrics?.device_placed_days}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="LAM_SANG"
                      />
                )}

                {suspectedType !== "LOAI_TRU" && clinicalPathway === "PNEU" && vaeForm && (
                      <PneuClinicalSubForm
                        form={vaeForm}
                        onChange={setVaeForm}
                        symptomDates={symptomDates}
                        onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                        allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                        ngayVaoVien={row.ngay_vao_vien}
                        ngayPhatHien={row.ngay_phat_hien}
                        iwpStart={liveCdcMetrics?.iwp_start}
                        iwpEnd={liveCdcMetrics?.iwp_end}
                        activeTab="LAM_SANG"
                      />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "UTI" && utiForm && (
                  <UtiClinicalSubForm
                    form={utiForm}
                    onChange={setUtiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                    liveDeviceDays={liveCdcMetrics?.device_placed_days}
                    liveDeviceActive={liveCdcMetrics?.device_active_on_event}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="LAM_SANG"
                  />
                )}

                {suspectedType !== "LOAI_TRU" && checklistType === "SSI" && ssiForm && (
                  <SsiClinicalSubForm
                    form={ssiForm}
                    onChange={setSsiForm}
                    symptomDates={symptomDates}
                    onSymptomDateChange={(key: string, date: string) => setSymptomDates(prev => ({ ...prev, [key]: date }))}
                    allowedEdit={allowedEdit && (simulatedRole === 'LAM_SANG' || simulatedRole === 'KSNK')}
                    ngayVaoVien={row.ngay_vao_vien}
                    ngayPhatHien={row.ngay_phat_hien}
                    iwpStart={liveCdcMetrics?.iwp_start}
                    iwpEnd={liveCdcMetrics?.iwp_end}
                    activeTab="LAM_SANG"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHÁN QUYẾT KSNK */}
          {activeTab === 'KSNK' && (
            <NkbvChecklistKsnkTab
              row={row}
              suspectedType={suspectedType}
              checklistType={checklistType}
              liveEvaluation={liveEvaluation}
              liveCdcMetrics={liveCdcMetrics}
              treatmentHistory={treatmentHistory}
              allowedEdit={allowedEdit}
              simulatedRole={simulatedRole}
              adjudicating={adjudicating}
              onAdjudicate={handleAdjudicate}
            />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="mt-4 flex justify-between items-center border-t border-slate-100 pt-4">
          <span className="text-[11px] text-slate-400 italic">
            💡 KTV Vi sinh nhập LIS ở Tab 1, Bác sĩ LS nhập ở Tab 2, KSNK duyệt phán quyết ở Tab 3.
          </span>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={C.ctaSecondary}>
              Đóng
            </button>
            {activeTab !== "KSNK" ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveChecklist}
                className={`${C.ctaPrimary} disabled:opacity-50 animate-in fade-in`}
              >
                {submitting ? "Đang lưu…" : `Lưu dữ liệu khoa ${activeTab === "VI_SINH" ? "vi sinh" : "lâm sàng"}`}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
