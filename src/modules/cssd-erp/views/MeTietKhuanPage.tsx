// src/modules/cssd-erp/views/MeTietKhuanPage.tsx
// Refactored modular view
"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import MeTietKhuanCreateStep from "../components/batch/me-tiet-khuan-create-step";
import MeTietKhuanProcessStep from "../components/batch/me-tiet-khuan-process-step";
import { buildMeTietKhuanBatchColumns } from "../components/batch/me-tiet-khuan-columns";
import CssdPrintPortal from "../components/print/CssdPrintPortal";
import { useMeTietKhuanWorkflow } from "../hooks/use-me-tiet-khuan-workflow";
import { CSSD_UI_ACTION_PRIMARY } from "../shared/ui/cssd-ui-chrome";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import { cssdSuCoBatchRecallHref } from "@/lib/cssd-routes";

export default function MeTietKhuanPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const w = useMeTietKhuanWorkflow();
  const [isIncidentOpen, setIsIncidentOpen] = React.useState(false);
  const [isBatchRecallOpen, setIsBatchRecallOpen] = React.useState(false);

  const batchColumns = React.useMemo(
    () =>
      buildMeTietKhuanBatchColumns({
        onPrintBatch: (batchId) => void w.onPrintBatch({ batchId }),
        isPrinting: w.isCssdPrinting,
      }),
    [w.onPrintBatch, w.isCssdPrinting],
  );

  const printPortal = <CssdPrintPortal printState={w.printState} />;
  const [listSearch, setListSearch] = React.useState("");

  const filteredBatches = React.useMemo(() => {
    const q = listSearch.trim().toUpperCase();
    if (!q) return w.batches;
    return (w.batches || []).filter((b: { ma_lo_tiet_khuan?: string; thiet_bi?: { ten_thiet_bi?: string } }) => {
      const ma = String(b.ma_lo_tiet_khuan || "").toUpperCase();
      const tb = String(b.thiet_bi?.ten_thiet_bi || "").toUpperCase();
      return ma.includes(q) || tb.includes(q);
    });
  }, [listSearch, w.batches]);

  if (w.step === "CREATE") {
    const createContent = (
      <div className={`${CSSD_PAGE_OUTER} animate-in slide-in-from-bottom-6 duration-300`}>
        <MeTietKhuanCreateStep
          machines={w.machines}
          machineId={w.machineId}
          nguoiLoad={w.nguoiLoad}
          onMachineChange={w.setMachineId}
          onNguoiLoadChange={w.setNguoiLoad}
          onCancel={() => w.setStep("LIST")}
          onStart={() => void w.createMe()}
        />
      </div>
    );
    if (suppressShell) return (<>{createContent}{printPortal}</>);
    return (
      <CSSDPageShell title={<span className="text-[var(--primary)]">Mẻ tiệt khuẩn</span>}>
        {createContent}
        {printPortal}
      </CSSDPageShell>
    );
  }

  if (w.step === "PROCESS")
    return (
      <>
      <MeTietKhuanProcessStep
        activeMe={w.activeMe}
        batchGate={w.batchGate}
        items={w.items}
        waitingRows={w.waitingRows}
        nguoiUnload={w.nguoiUnload}
        setNguoiUnload={w.setNguoiUnload}
        nhietDo={w.nhietDo}
        setNhietDo={w.setNhietDo}
        thongSoMay={w.thongSoMay}
        setThongSoMay={w.setThongSoMay}
        chiThiTiepXuc={w.chiThiTiepXuc}
        setChiThiTiepXuc={w.setChiThiTiepXuc}
        chiThiDaThongSo={w.chiThiDaThongSo}
        setChiThiDaThongSo={w.setChiThiDaThongSo}
        testSinhHoc={w.testSinhHoc}
        setTestSinhHoc={w.setTestSinhHoc}
        testCI={w.testCI}
        setTestCI={w.setTestCI}
        testBD={w.testBD}
        setTestBD={w.setTestBD}
        anhMay={w.anhMay}
        setAnhMay={w.setAnhMay}
        anhTiepXuc={w.anhTiepXuc}
        setAnhTiepXuc={w.setAnhTiepXuc}
        anhDaThongSo={w.anhDaThongSo}
        setAnhDaThongSo={w.setAnhDaThongSo}
        anhSinhHoc={w.anhSinhHoc}
        setAnhSinhHoc={w.setAnhSinhHoc}
        anhBowieDick={w.anhBowieDick}
        setAnhBowieDick={w.setAnhBowieDick}
        onBackToList={w.backToList}
        onAddItemByCode={(code) => void w.addItem(code)}
        onConfirmBatDau={() => void w.confirmBatDau()}
        onConfirmKetThucChuTrinh={() => void w.confirmKetThucChuTrinh()}
        onFinishQc={(isPass, overrideThongSoMay) => void w.finishQc(isPass, overrideThongSoMay)}
        onPrintBatch={() => w.activeMe?.id && void w.onPrintBatch({ batchId: w.activeMe.id })}
        isPrintBusy={w.isCssdPrinting}
        onReportIncident={() => setIsBatchRecallOpen(true)}
        suppressShell={suppressShell}
      />
      {printPortal}
      <IncidentReportModal
        isOpen={isBatchRecallOpen}
        onClose={() => setIsBatchRecallOpen(false)}
        station="TIET_KHUAN"
        defaultGroup="PROCESS"
        initialTypeId="PROCESS_BI_POSITIVE"
        initialMaLo={w.activeMe?.ma_lo_tiet_khuan}
        initialLoTietKhuanId={w.activeMe?.id}
        batchRecallEntry
      />
      <IncidentReportModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        station="TIET_KHUAN"
        defaultGroup="PROCESS"
        initialTypeId="PROCESS_STERILIZATION_FAIL"
        initialMaLo={w.activeMe?.ma_lo_tiet_khuan}
        initialLoTietKhuanId={w.activeMe?.id}
      />
      </>
    );

  const listContent = (
    <div className="bv103-stack-page">
      {suppressShell && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Danh sách mẻ tiệt khuẩn</h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href={cssdSuCoBatchRecallHref()}
              className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              Thu hồi theo mẻ
            </Link>
            <button
              type="button"
              onClick={() => w.setStep("CREATE")}
              className={CSSD_UI_ACTION_PRIMARY}
            >
              <Plus size={18} /> Mở mẻ mới
            </button>
          </div>
        </div>
      )}
      <div className="min-w-0">
        <AdvancedDataTable
          columns={batchColumns}
          data={filteredBatches}
          loading={w.loading}
          searchPlaceholder="Tìm mã lô hoặc quét LOT-…"
          searchValue={listSearch}
          onSearch={setListSearch}
          enableQrScan
          onQrScan={(code) => {
            const c = String(code || "").trim().toUpperCase();
            setListSearch(c);
            const hit = (w.batches || []).find(
              (b: { ma_lo_tiet_khuan?: string }) =>
                String(b.ma_lo_tiet_khuan || "").trim().toUpperCase() === c,
            );
            if (hit) w.openRowForProcess(hit);
          }}
          onRowClick={w.openRowForProcess}
        />
      </div>
    </div>
  );

  if (suppressShell) return (<>{listContent}{printPortal}</>);

  return (
    <CSSDPageShell
      title={<span className="text-[var(--primary)]">Mẻ tiệt khuẩn</span>}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => w.setStep("CREATE")}
            className={CSSD_UI_ACTION_PRIMARY}
          >
            <Plus size={18} /> Mở mẻ mới
          </button>
          <Link
            href={cssdSuCoBatchRecallHref()}
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-5 text-[11px] font-semibold text-amber-900 shadow-sm hover:bg-amber-100 active:scale-[0.98] transition-all"
            title="Thu hồi theo mẻ — sự cố an toàn QT.24"
          >
            Thu hồi theo mẻ
          </Link>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 text-[11px] font-semibold text-red-600 shadow-sm hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
            onClick={() => setIsIncidentOpen(true)}
          >
            ⚠️ Báo sự cố
          </button>
        </div>
      }
    >
      {listContent}
      {printPortal}
      <IncidentReportModal
        isOpen={isIncidentOpen}
        onClose={() => setIsIncidentOpen(false)}
        station="TIET_KHUAN"
        defaultGroup="PROCESS"
        initialTypeId="PROCESS_STERILIZATION_FAIL"
        initialMaLo={w.activeMe?.ma_lo_tiet_khuan}
        initialLoTietKhuanId={w.activeMe?.id}
      />
      <IncidentReportModal
        isOpen={isBatchRecallOpen}
        onClose={() => setIsBatchRecallOpen(false)}
        station="TIET_KHUAN"
        defaultGroup="PROCESS"
        initialTypeId="PROCESS_BI_POSITIVE"
        initialMaLo={w.activeMe?.ma_lo_tiet_khuan}
        initialLoTietKhuanId={w.activeMe?.id}
        batchRecallEntry
      />
    </CSSDPageShell>
  );
}
