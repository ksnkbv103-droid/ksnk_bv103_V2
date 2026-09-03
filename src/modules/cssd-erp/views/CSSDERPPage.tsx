// src/modules/cssd-erp/views/CSSDERPPage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useCSSDWorkflow } from "../hooks/useCSSDWorkflow";
import WaitingList from "../components/waiting-list/WaitingList";
import QRScanSuccessCard from "../components/scan/QRScanSuccessCard";
import WorkflowStationQrEntry from "../components/scan/WorkflowStationQrEntry";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "../types/cssd.types";
import { SCAN_STATIONS } from "../workflow/domain/cssd-stations";
import { isValidStation } from "../workflow/domain/cssd-state-engine";
import { cssdQuyTrinhBatchTabHref } from "@/lib/cssd-routes";
import { useCssdPrint } from "../hooks/use-cssd-print";
import CssdPrintPortal from "../components/print/CssdPrintPortal";
import CompositionReconcilePanel from "../components/packaging/CompositionReconcilePanel";
import CssdStationFlowMap from "../components/workflow/CssdStationFlowMap";
import { usePrint } from "@/hooks/usePrint";

const MODULE_KEY = "CSSD_WORKFLOW";

/**
 * Trang quản lý quy trình CSSD ERP - Layout 2 cột tối ưu Workflow
 * Đã bổ sung thanh điều hướng Module (Sub-menu).
 */
export default function CSSDERPPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const searchParams = useSearchParams();
  const {
    currentStation,
    waitingList,
    loading: workflowLoading,
    lastScan,
    scanSuccess,
    dongGoiGate,
    selectStation,
    handleQRScan,
    confirmDongGoiAdvance,
    cancelDongGoiGate,
    refresh,
  } = useCSSDWorkflow();
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const { printState, onPrintCapPhat, isPrinting: isCssdPrinting } = useCssdPrint();
  const { printCycleLabel } = usePrint();
  const lastDongGoiCyclePrintKey = React.useRef<string | null>(null);

  const stationParam = searchParams.get("station");
  useEffect(() => {
    if (dongGoiGate) return;
    const raw = stationParam?.trim().toUpperCase() || "";
    if (!raw || !isValidStation(raw) || raw === "TIET_KHUAN") return;
    if (!(SCAN_STATIONS as readonly string[]).includes(raw)) return;
    selectStation(raw as Station);
  }, [stationParam]);

  useEffect(() => {
    if (currentStation !== "DONG_GOI" || !lastScan?.maCycleQr) return;
    const key = `${lastScan.maCycleQr}-${lastScan.thoiGianQuet}`;
    if (lastDongGoiCyclePrintKey.current === key) return;
    lastDongGoiCyclePrintKey.current = key;
    void printCycleLabel({
      qrCode: String(lastScan.maCycleQr),
      tenBo: String(lastScan.tenBoDungCu || "Bộ dụng cụ CSSD"),
    }).catch(() => {
      toast.message(`Đã đóng gói — mã chu trình: ${lastScan.maCycleQr}`);
    });
  }, [currentStation, lastScan, printCycleLabel]);

  const { loading: permLoading, allowed } = useModulePermission(MODULE_KEY);
  const { allowed: incidentAllowed } = useModulePermission("BAO_SU_CO");
  const canViewWorkflow = allowed.view;
  // Quyền báo sự cố phải theo module BAO_SU_CO (không phụ thuộc workflow edit/delete).
  const canCreateIncident = incidentAllowed.create;

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
        <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
          <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập luồng quy trình CSSD.</p>
          <p className="mt-2 text-xs text-slate-500">Liên hệ quản trị nếu cần cấp quyền module workflow.</p>
        </div>
      </div>
    );
  }

  const submitWorkflowQr = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    if (currentStation === "TIET_KHUAN") {
      toast.error(`Không quét trạm Tiệt khuẩn tại đây. Dùng tab Mẻ tiệt khuẩn (${cssdQuyTrinhBatchTabHref()}).`, { duration: 9000 });
      return;
    }

    void handleQRScan(code);
  };

  const showDongGoiGate = currentStation === "DONG_GOI" && !!dongGoiGate;
  const showScanSuccess = scanSuccess && !showDongGoiGate;

  const requestSelectStation = (station: Station) => {
    if (showDongGoiGate && station !== currentStation) {
      toast.message("Đang kiểm bộ — bấm «Đóng» trên thẻ bộ trước khi đổi trạm.");
      return;
    }
    selectStation(station);
  };

  const mainContent = (
    <div className="bv103-stack-page animate-in fade-in duration-500">
      <CssdStationFlowMap
        activeStation={currentStation}
        onSelectStation={requestSelectStation}
        gateLocked={showDongGoiGate}
      />

      <main className="grid grid-cols-1 items-start gap-[var(--bv103-space-3)] lg:grid-cols-12">
        <div className="bv103-stack-in lg:col-span-6">
          {currentStation ? <WaitingList items={waitingList} onAction={submitWorkflowQr} /> : (
            <div className="bv103-layer-inset py-16 text-center bv103-type-label font-semibold uppercase tracking-wide text-slate-400">
              Chọn trạm để xem hàng chờ.
            </div>
          )}
        </div>

        <div className="bv103-stack-in lg:col-span-6 lg:sticky lg:top-8">
          <WorkflowStationQrEntry
            disabled={workflowLoading}
            onConfirm={submitWorkflowQr}
          />
          {showDongGoiGate && dongGoiGate ? (
            <CompositionReconcilePanel
              boDungCuId={dongGoiGate.boDungCuId}
              quyTrinhId={dongGoiGate.quyTrinhId}
              enabled
              gateMode
              advancing={workflowLoading}
              onConfirmAdvance={() => void confirmDongGoiAdvance()}
              onCancelGate={cancelDongGoiGate}
            />
          ) : showScanSuccess ? (
            <QRScanSuccessCard
              {...lastScan}
              tramDisplay={currentStation?.replace(/_/g, " ") || "CSSD"}
              ledgerWarning={lastScan?.ledgerWarning}
              onPrintCapPhat={
                lastScan?.quyTrinhId
                  ? () =>
                      void onPrintCapPhat({
                        quyTrinhId: String(lastScan.quyTrinhId),
                        nguoiCapPhat: String(lastScan.nguoiThucHien || "CSSD"),
                      })
                  : undefined
              }
              isPrintBusy={isCssdPrinting}
            />
          ) : null}
        </div>
      </main>
      <IncidentReportModal
        isOpen={isIncidentOpen && canCreateIncident}
        onClose={() => setIsIncidentOpen(false)}
        station={currentStation || "TIEP_NHAN"}
        onSuccess={refresh}
        defaultGroup="PROCESS"
        initialMaQR={lastScan?.qrCode ? String(lastScan.qrCode) : undefined}
        quyTrinhId={lastScan?.quyTrinhId ? String(lastScan.quyTrinhId) : undefined}
      />
    </div>
  );

  if (suppressShell) {
    return (
      <>
        {mainContent}
        <CssdPrintPortal printState={printState} />
      </>
    );
  }

  return (
    <CSSDPageShell
      title={
        <>
          Quản lý <span className="text-[var(--primary)]">CSSD</span>
        </>
      }
      actions={
        <button
          type="button"
          onClick={() => setIsIncidentOpen(true)}
          disabled={!canCreateIncident}
          className="bv103-control-h inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertTriangle size={16} aria-hidden /> Báo sự cố
        </button>
      }
    >
      {mainContent}
      <CssdPrintPortal printState={printState} />
    </CSSDPageShell>
  );
}
