// src/modules/cssd-erp/views/StationWorkflowView.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { QrCode, AlertTriangle } from "lucide-react";
import { useCSSDWorkflow } from "../hooks/useCSSDWorkflow";
import WaitingList from "../components/waiting-list/WaitingList";
import QRScanSuccessCard from "../components/scan/QRScanSuccessCard";
import WorkflowStationQrEntry from "../components/scan/WorkflowStationQrEntry";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "../types/cssd.types";
import { CSSD_UI_SECTION_TITLE } from "../shared/ui/cssd-ui-chrome";

interface StationWorkflowViewProps {
  station: Station;
  title: string;
  subtitle: string;
}

/**
 * View chuyên biệt cho từng trạm CSSD. 
 * Loại bỏ lưới chọn trạm, tập trung vào việc quét và danh sách chờ của trạm đó.
 */
export default function StationWorkflowView({ station, title, subtitle }: StationWorkflowViewProps) {
  const { 
    waitingList, 
    lastScan, 
    scanSuccess, 
    selectStation, 
    handleQRScan, 
    refresh 
  } = useCSSDWorkflow();
  
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [maCaMoId, setMaCaMoId] = useState("");
  const { loading: permLoading, allowed } = useModulePermission("CSSD_WORKFLOW");
  const { allowed: incidentAllowed } = useModulePermission("BAO_SU_CO");
  
  // Tự động chọn trạm khi mount
  useEffect(() => {
    selectStation(station);
  }, [station]);

  if (permLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
  }

  if (!allowed.view) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
        <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập chức năng này.</p>
      </div>
    );
  }

  const submitWorkflowQr = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const extra = station === "CAP_PHAT" && maCaMoId ? { ma_ca_mo_id: maCaMoId } : undefined;
    void handleQRScan(code, extra);
  };

  return (
    <CSSDPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsIncidentOpen(true)}
            disabled={!incidentAllowed.create}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AlertTriangle size={18} aria-hidden /> Báo sự cố (nhanh)
          </button>
        </div>
      }
    >
      <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between px-1">
            <h3 className={CSSD_UI_SECTION_TITLE}>Danh sách chờ tại trạm</h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              {station.replace(/_/g, " ")}
            </span>
          </div>
          <WaitingList items={waitingList} onAction={submitWorkflowQr} />
        </div>

        <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-8">
          <h3 className={`px-1 ${CSSD_UI_SECTION_TITLE}`}>Quét & kết quả</h3>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            
            {station === "CAP_PHAT" && (
              <div className="animate-in slide-in-from-top-2">
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-emerald-700">Truy vết ca mổ / bệnh nhân (tùy chọn)</label>
                <input 
                  value={maCaMoId}
                  onChange={e => setMaCaMoId(e.target.value)}
                  placeholder="Nhập mã số ca mổ hoặc tên bệnh nhân..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            )}

            <WorkflowStationQrEntry
              waitingItems={waitingList}
              disabled={false}
              onConfirm={submitWorkflowQr}
            />
            {scanSuccess ? (
              <QRScanSuccessCard
                {...lastScan}
                tramDisplay={station.replace(/_/g, " ")}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-slate-400">
                <QrCode size={36} className="opacity-40" />
                <p className="text-[10px] font-medium uppercase tracking-[0.2em]">Sẵn sàng quét QR</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <IncidentReportModal 
        isOpen={isIncidentOpen && incidentAllowed.create} 
        onClose={() => setIsIncidentOpen(false)} 
        station={station} 
        onSuccess={refresh} 
      />
    </CSSDPageShell>
  );
}
