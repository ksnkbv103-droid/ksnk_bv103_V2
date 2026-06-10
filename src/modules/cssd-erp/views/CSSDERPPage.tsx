// src/modules/cssd-erp/views/CSSDERPPage.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Clock, QrCode, AlertTriangle, WashingMachine, Microscope, Box, Truck } from "lucide-react";
import { useCSSDWorkflow } from "../hooks/useCSSDWorkflow";
import WaitingList from "../components/waiting-list/WaitingList";
import QRScanSuccessCard from "../components/scan/QRScanSuccessCard";
import WorkflowStationQrEntry from "../components/scan/WorkflowStationQrEntry";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CssdBatchMeLinkChip from "../components/workflow/cssd-batch-me-link-chip";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "../types/cssd.types";
import { CSSD_UI_CONTROL, CSSD_UI_FORM_LABEL, CSSD_UI_PANEL, CSSD_UI_SECTION_TITLE, CSSD_UI_STEP_HINT } from "../shared/ui/cssd-ui-chrome";
import WorkflowManualOpsPanel from "../components/workflow/WorkflowManualOpsPanel";
import { SCAN_STATIONS } from "../workflow/domain/cssd-stations";
import { isValidStation } from "../workflow/domain/cssd-state-engine";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { isBOMChecklistEnabled } from "@/lib/bv103-feature-config";
import { resolveQuyTrinhForCheckpoint } from "../actions/cssd-bom-checkpoint.actions";
import BomChecklistModal from "../components/packaging/BomChecklistModal";

const MODULE_KEY = "CSSD_WORKFLOW";

const stationVnNames: Record<Station, string> = {
  TIEP_NHAN: "Tiếp nhận",
  LAM_SACH: "Làm sạch",
  QC: "QC / Kiểm chuẩn",
  DONG_GOI: "Đóng gói",
  TIET_KHUAN: "Tiệt khuẩn",
  CAP_PHAT: "Cấp phát",
};

/**
 * Trang quản lý quy trình CSSD ERP - Layout 2 cột tối ưu Workflow
 * Đã bổ sung thanh điều hướng Module (Sub-menu).
 */
export default function CSSDERPPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const searchParams = useSearchParams();
  const { currentStation, scanStations, waitingList, loading: _workflowLoading, lastScan, scanSuccess, selectStation, handleQRScan, refresh } = useCSSDWorkflow();
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [maCaMoId, setMaCaMoId] = useState("");
  const [bomModalOpen, setBomModalOpen] = useState(false);
  const [bomQuyTrinhId, setBomQuyTrinhId] = useState("");
  const [bomBoDungCuId, setBomBoDungCuId] = useState("");
  const [pendingQrCode, setPendingQrCode] = useState("");

  const stationParam = searchParams.get("station");
  useEffect(() => {
    const raw = stationParam?.trim().toUpperCase() || "";
    if (!raw || !isValidStation(raw) || raw === "TIET_KHUAN") return;
    if (!(SCAN_STATIONS as readonly string[]).includes(raw)) return;
    selectStation(raw as Station);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ khi ?station= đổi trên URL
  }, [stationParam]);
  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const { allowed: incidentAllowed } = useModulePermission("BAO_SU_CO");
  const canViewWorkflow = allowed.view;
  // Quyền báo sự cố phải theo module BAO_SU_CO (không phụ thuộc workflow edit/delete).
  const canCreateIncident = incidentAllowed.create;

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
        <div className="rounded-2xl border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
          <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập luồng quy trình CSSD.</p>
          <p className="mt-2 text-xs text-slate-500">Liên hệ quản trị nếu cần cấp quyền module workflow.</p>
        </div>
      </div>
    );
  }

  const handleBomCheckFinished = (isOk: boolean, warningSummary?: string) => {
    const extra = warningSummary ? { warning: warningSummary } : undefined;
    void handleQRScan(pendingQrCode, extra);
    setBomModalOpen(false);
  };

  const submitWorkflowQr = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    if (currentStation === "TIET_KHUAN") {
      toast.error("Không quét trạm Tiệt khuẩn tại đây. Dùng trang Mẻ tiệt khuẩn (/cssd-erp/batch).", { duration: 9000 });
      return;
    }

    const isBomEnabled = typeof window !== "undefined" && isBOMChecklistEnabled();

    if (currentStation === "DONG_GOI" && isBomEnabled) {
      toast.loading("Đang đối chiếu dữ liệu thiết kế...", { id: "bom-resolve" });
      try {
        const res = await resolveQuyTrinhForCheckpoint(code);
        toast.dismiss("bom-resolve");
        if (res.success) {
          setBomQuyTrinhId(res.quyTrinhId);
          setBomBoDungCuId(res.boDungCuId);
          setPendingQrCode(code);
          setBomModalOpen(true);
        }
      } catch (e: any) {
        toast.dismiss("bom-resolve");
        toast.error(e.message || "Lỗi truy vấn quy trình.");
      }
      return;
    }

    const extra = currentStation === "CAP_PHAT" && maCaMoId ? { ma_ca_mo_id: maCaMoId } : undefined;
    void handleQRScan(code, extra);
  };

  const mainContent = (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Lựa chọn trạm làm việc */}
      <section className={`space-y-4 p-4 ${CSSD_UI_PANEL}`}>
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <h2 className={CSSD_UI_SECTION_TITLE}>Quy trình quét trạm (không gồm mẻ hấp)</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            {currentStation ? stationVnNames[currentStation] : "Chưa chọn trạm"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {stationsBeforeCap.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectStation(s)}
              className={`group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all ${
                currentStation === s
                   ? "border-emerald-600 bg-emerald-600 text-white shadow-lg"
                   : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              <div
                className={`${currentStation === s ? "text-amber-300" : "text-slate-300 group-hover:text-emerald-600"} transition-all`}
              >
                {stationIcons[s]}
              </div>
              <span
                className={`text-center text-[11px] font-bold leading-tight tracking-wide ${currentStation === s ? "text-white" : "text-slate-700"}`}
              >
                {stationVnNames[s]}
              </span>
            </button>
          ))}
          <CssdBatchMeLinkChip />
          <button
            type="button"
            onClick={() => selectStation(capStation)}
            className={`group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-all ${
              currentStation === capStation
                ? "border-emerald-600 bg-emerald-600 text-white shadow-lg"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <div
              className={`${currentStation === capStation ? "text-amber-300" : "text-slate-300 group-hover:text-emerald-600"} transition-all`}
            >
              {stationIcons[capStation]}
            </div>
            <span
              className={`text-center text-[11px] font-bold leading-tight tracking-wide ${currentStation === capStation ? "text-white" : "text-slate-700"}`}
            >
              {stationVnNames[capStation]}
            </span>
          </button>
        </div>
      </section>

      {/* 4. Workflow Area */}
      <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          {currentStation ? <WaitingList items={waitingList} onAction={submitWorkflowQr} /> : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Vui lòng chọn trạm làm việc để bắt đầu</div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-6 lg:sticky lg:top-8">
          <h3 className={`px-1 ${CSSD_UI_SECTION_TITLE}`}>Quét & kết quả</h3>
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            
            {currentStation === "CAP_PHAT" && (
              <div className="animate-in slide-in-from-top-2">
                <label className={`mb-2 ${CSSD_UI_FORM_LABEL} text-emerald-800`}>Truy vết ca mổ / bệnh nhân (tùy chọn)</label>
                <input
                  value={maCaMoId}
                  onChange={e => setMaCaMoId(e.target.value)}
                  placeholder="Nhập mã số ca mổ hoặc tên bệnh nhân…"
                  className={CSSD_UI_CONTROL}
                />
              </div>
            )}

            <WorkflowStationQrEntry
              waitingItems={waitingList}
              disabled={!currentStation}
              onConfirm={submitWorkflowQr}
            />
            {scanSuccess ? (
              <>
                <QRScanSuccessCard
                  {...lastScan}
                  tramDisplay={currentStation?.replace(/_/g, " ") || "CSSD"}
                />
                {lastScan?.qrCode && !lastScan?.isOffline ? (
                  <WorkflowManualOpsPanel
                    qrCode={lastScan.qrCode}
                    onSuccess={() => refresh()}
                  />
                ) : null}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16 text-slate-400">
                <QrCode size={36} className="opacity-40" />
                <p className={CSSD_UI_STEP_HINT}>Chờ lệnh quét QR mới</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <IncidentReportModal isOpen={isIncidentOpen && canCreateIncident} onClose={() => setIsIncidentOpen(false)} station={currentStation || 'TIEP_NHAN'} onSuccess={refresh} />
      <BomChecklistModal
        isOpen={bomModalOpen}
        onClose={() => setBomModalOpen(false)}
        quyTrinhId={bomQuyTrinhId}
        boDungCuId={bomBoDungCuId}
        onCheckFinished={handleBomCheckFinished}
      />
    </div>
  );

  if (suppressShell) {
    return mainContent;
  }

  return (
    <CSSDPageShell
      title={
        <>
          Quản lý <span className="text-[var(--primary)]">CSSD</span>
        </>
      }
      subtitle="Chọn trạm làm việc và quét mã QR đã in từ danh mục."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canCreateIncident ? (
            <Link
              href={CSSD_ROUTES.suCo}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Trang ghi nhận sự cố
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setIsIncidentOpen(true)}
            disabled={!canCreateIncident}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <AlertTriangle size={18} aria-hidden /> Báo sự cố (nhanh)
          </button>
        </div>
      }
    >
      {mainContent}
    </CSSDPageShell>
  );
}
