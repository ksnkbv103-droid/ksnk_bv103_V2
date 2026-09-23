// src/modules/cssd-erp/views/CSSDERPPage.tsx
"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCSSDWorkflow } from "../hooks/useCSSDWorkflow";
import WaitingList from "../components/waiting-list/WaitingList";
import QRScanSuccessCard from "../components/scan/QRScanSuccessCard";
import WorkflowStationQrEntry from "../components/scan/WorkflowStationQrEntry";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "../types/cssd.types";
import { SCAN_STATIONS } from "../workflow/domain/cssd-stations";
import { isValidStation } from "../workflow/domain/cssd-state-engine";
import { CSSD_ROUTES, cssdQuyTrinhBatchTabHref } from "@/lib/cssd-routes";
import { useCssdPrint } from "../hooks/use-cssd-print";
import CssdPrintPortal from "../components/print/CssdPrintPortal";
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
    selectStation,
    handleQRScan,
  } = useCSSDWorkflow();
  const { printState, onPrintCapPhat, isPrinting: isCssdPrinting } = useCssdPrint();
  const { printCycleLabel } = usePrint();
  const lastDongGoiCyclePrintKey = React.useRef<string | null>(null);

  const stationParam = searchParams.get("station");
  useEffect(() => {
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
  const canViewWorkflow = allowed.view;
  if (permLoading) {
    const loadingInner = (
      <div className="flex h-[50vh] items-center justify-center" aria-busy="true">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
      </div>
    );
    return suppressShell ? loadingInner : <div className={CSSD_PAGE_OUTER}>{loadingInner}</div>;
  }

  if (!canViewWorkflow) {
    const deniedInner = (
      <div className="rounded-[var(--radius-shell)] border border-slate-200 bg-[var(--bg-panel)] px-8 py-12 text-center shadow-[var(--shadow-app-soft)]">
        <p className="text-sm font-medium text-slate-600">Bạn không có quyền truy cập luồng quy trình CSSD.</p>
        <p className="mt-2 text-xs text-slate-500">Liên hệ quản trị nếu cần cấp quyền module workflow.</p>
      </div>
    );
    return suppressShell ? deniedInner : <div className={CSSD_PAGE_OUTER}>{deniedInner}</div>;
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

  const mainContent = (
    <div className="space-y-[var(--bv103-space-3)] animate-in fade-in duration-500">
      <CssdStationFlowMap
        activeStation={currentStation}
        onSelectStation={selectStation}
      />

      <main className="grid grid-cols-1 items-start gap-[var(--bv103-space-3)] lg:grid-cols-12">
        <div className="bv103-stack-in lg:col-span-6">
          {currentStation ? <WaitingList items={waitingList} onAction={submitWorkflowQr} /> : (
            <div className="bv103-layer-inset py-16 text-center bv103-type-label font-semibold text-slate-400">
              Chọn trạm để xem hàng chờ.
            </div>
          )}
        </div>

        <div className="bv103-stack-in lg:col-span-6 lg:sticky lg:top-8">
          <WorkflowStationQrEntry
            disabled={workflowLoading}
            onConfirm={submitWorkflowQr}
          />
          {scanSuccess ? (
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
        currentStation === "DONG_GOI" ? null : (
          <a
            href={CSSD_ROUTES.suCo}
            className="bv103-control-h inline-flex items-center text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            Sự cố & biến động
          </a>
        )
      }
    >
      {mainContent}
      <CssdPrintPortal printState={printState} />
    </CSSDPageShell>
  );
}
