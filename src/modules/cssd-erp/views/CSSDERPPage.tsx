// src/modules/cssd-erp/views/CSSDERPPage.tsx
"use client";

import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { Clock, QrCode, AlertTriangle, WashingMachine, Microscope, Box, Truck } from "lucide-react";
import { useCSSDWorkflow } from "../hooks/useCSSDWorkflow";
import WaitingList from "../components/waiting-list/WaitingList";
import QRScanSuccessCard from "../components/scan/QRScanSuccessCard";
import IncidentReportModal from "../components/incident/IncidentReportModal";
import CSSDSubNav from "../components/navigation/CSSDSubNav";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CssdBatchMeLinkChip from "../components/workflow/cssd-batch-me-link-chip";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "../types/cssd.types";

const MODULE_KEY = "CSSD_WORKFLOW";

/**
 * Trang quản lý quy trình CSSD ERP - Layout 2 cột tối ưu Workflow
 * Đã bổ sung thanh điều hướng Module (Sub-menu).
 */
export default function CSSDERPPage() {
  const qrInputRef = useRef<HTMLInputElement>(null);
  const { currentStation, scanStations, waitingList, loading: _workflowLoading, lastScan, scanSuccess, selectStation, handleQRScan, refresh } = useCSSDWorkflow();
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [maCaMoId, setMaCaMoId] = useState("");
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const canViewWorkflow = allowed.view;
  // Quyền báo sự cố dựa trên quyền thao tác module workflow.
  const canCreateIncident = allowed.manage;

  const stationIcons: Record<string, React.ReactNode> = {
    TIEP_NHAN: <Clock size={20} />,
    LAM_SACH: <WashingMachine size={20} />,
    QC: <Microscope size={20} />,
    DONG_GOI: <Box size={20} />,
    CAP_PHAT: <Truck size={20} />,
  };

  const stationsBeforeCap = scanStations.slice(0, 4) as Station[];
  const capStation = scanStations[4] as Station;

  if (permLoading) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <div className="flex h-[50vh] items-center justify-center" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        </div>
      </div>
    );
  }

  if (!canViewWorkflow) {
    return (
      <div className={CSSD_PAGE_OUTER}>
        <CSSDSubNav />
        <div className="rounded-2xl border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
          <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập luồng quy trình CSSD.</p>
          <p className="mt-2 text-xs text-slate-500">Liên hệ quản trị nếu cần cấp quyền module workflow.</p>
        </div>
      </div>
    );
  }

  const confirmQr = () => {
    const raw = qrInputRef.current?.value?.trim();
    if (!raw) return;
    if (currentStation === "TIET_KHUAN") {
      toast.error("Không quét trạm Tiệt khuẩn tại đây. Dùng trang Mẻ tiệt khuẩn (/cssd-erp/batch).", { duration: 9000 });
      qrInputRef.current!.value = "";
      return;
    }
    qrInputRef.current!.value = "";
    const extra = currentStation === "CAP_PHAT" && maCaMoId ? { ma_ca_mo_id: maCaMoId } : undefined;
    void handleQRScan(raw.toUpperCase(), extra);
  };

  return (
    <CSSDPageShell
      title={
        <>
          Quản lý <span className="text-[#026f17]">CSSD</span>
        </>
      }
      subtitle="Chọn trạm làm việc và quét mã QR đã in từ danh mục."
      actions={
        <button
          type="button"
          onClick={() => setIsIncidentOpen(true)}
          disabled={!canCreateIncident}
          className="app-shell-focus flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto touch-manipulation"
        >
          <AlertTriangle size={18} aria-hidden /> Báo sự cố
        </button>
      }
    >
      {/* Lựa chọn trạm làm việc */}
      <section className="space-y-6">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Quy trình: 5 trạm quét + phiếu mẻ tiệt khuẩn</h2>
          <span className="text-[10px] font-black text-[#026f17] uppercase bg-[#026f17]/5 px-3 py-1 rounded-full">{currentStation || "Chưa chọn trạm"}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stationsBeforeCap.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectStation(s)}
              className={`group flex min-h-[120px] flex-col items-center justify-center gap-4 rounded-[32px] border-2 p-6 shadow-sm transition-all active:scale-95 ${
                currentStation === s
                  ? "z-10 scale-105 border-[#026f17] bg-[#026f17] text-white shadow-2xl"
                  : "border-white bg-white text-slate-300 hover:border-slate-100"
              }`}
            >
              <div
                className={`${currentStation === s ? "text-[#FFD700]" : "text-slate-200 group-hover:text-[#026f17]/30"} transition-all group-hover:scale-110`}
              >
                {stationIcons[s]}
              </div>
              <span
                className={`text-center text-[10px] font-black uppercase leading-tight tracking-tight ${currentStation === s ? "text-white" : "text-slate-500"}`}
              >
                {s.replace(/_/g, " ")}
              </span>
            </button>
          ))}
          <CssdBatchMeLinkChip />
          <button
            type="button"
            onClick={() => selectStation(capStation)}
            className={`group flex min-h-[120px] flex-col items-center justify-center gap-4 rounded-[32px] border-2 p-6 shadow-sm transition-all active:scale-95 ${
              currentStation === capStation
                ? "z-10 scale-105 border-[#026f17] bg-[#026f17] text-white shadow-2xl"
                : "border-white bg-white text-slate-300 hover:border-slate-100"
            }`}
          >
            <div
              className={`${currentStation === capStation ? "text-[#FFD700]" : "text-slate-200 group-hover:text-[#026f17]/30"} transition-all group-hover:scale-110`}
            >
              {stationIcons[capStation]}
            </div>
            <span
              className={`text-center text-[10px] font-black uppercase leading-tight tracking-tight ${currentStation === capStation ? "text-white" : "text-slate-500"}`}
            >
              {capStation.replace(/_/g, " ")}
            </span>
          </button>
        </div>
      </section>

      {/* 4. Workflow Area */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Danh sách chờ tại trạm</h3>
          {currentStation ? <WaitingList items={waitingList} onAction={handleQRScan} /> : (
            <div className="py-24 text-center border-4 border-dashed border-slate-200 rounded-[48px] text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] bg-white shadow-inner">Vui lòng chọn trạm làm việc để bắt đầu</div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-2">Quét & Kết quả</h3>
          <div className="bg-white p-2 rounded-[48px] shadow-2xl shadow-slate-200/50 border border-slate-100 space-y-4">
            
            {currentStation === "CAP_PHAT" && (
              <div className="px-4 pt-4 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-[#026f17] uppercase tracking-widest mb-2 block ml-2">Truy vết Ca mổ / Bệnh nhân (Không bắt buộc)</label>
                <input 
                  value={maCaMoId}
                  onChange={e => setMaCaMoId(e.target.value)}
                  placeholder="Nhập mã số ca mổ hoặc tên bệnh nhân..."
                  className="w-full h-12 px-6 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#026f17]/20 transition-all shadow-inner"
                />
              </div>
            )}

            <div className="flex w-full items-center gap-2 rounded-[36px] border border-green-800/10 bg-[#026f17] p-2 shadow-xl shadow-green-100">
              <input
                ref={qrInputRef}
                type="text"
                placeholder="Mã QR đã in (đăng ký từ danh mục bộ)…"
                autoCapitalize="characters"
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmQr();
                }}
                className="h-16 w-full rounded-[28px] border border-transparent bg-white/10 px-6 text-sm font-black uppercase text-[#FFD700] outline-none transition-all placeholder:text-[#FFD700]/35 focus:border-[#FFD700]/40"
              />
              <button
                type="button"
                onClick={confirmQr}
                className="h-16 shrink-0 rounded-[28px] bg-[#FFD700] px-6 text-xs font-black uppercase text-[#026f17] shadow-lg transition-all hover:brightness-110 active:scale-95 sm:px-8"
              >
                Xác nhận
              </button>
            </div>
            {scanSuccess ? (
              <QRScanSuccessCard
                {...lastScan}
                tramDisplay={currentStation?.replace(/_/g, " ") || "CSSD"}
              />
            ) : (
              <div className="py-24 flex flex-col items-center justify-center border-2 border-slate-50 rounded-[40px] bg-slate-50/30 border-dashed text-slate-300 gap-6">
                <QrCode size={48} className="opacity-10 animate-pulse" />
                <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Chờ lệnh quét QR mới</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <IncidentReportModal isOpen={isIncidentOpen && canCreateIncident} onClose={() => setIsIncidentOpen(false)} station={currentStation || 'TIEP_NHAN'} onSuccess={refresh} />
    </CSSDPageShell>
  );
}
