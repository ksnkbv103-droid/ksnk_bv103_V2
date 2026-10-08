// src/modules/cssd-erp/views/MeTietKhuanPage.tsx
// Refactored modular view
"use client";

import React from "react";
import { Plus } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import CSSDPageShell from "../components/layout/cssd-page-shell";
import MeTietKhuanCreateStep from "../components/batch/me-tiet-khuan-create-step";
import MeTietKhuanProcessStep from "../components/batch/me-tiet-khuan-process-step";
import { buildMeTietKhuanBatchColumns } from "../components/batch/me-tiet-khuan-columns";
import CssdPrintPortal from "../components/print/CssdPrintPortal";
import { useMeTietKhuanWorkflow } from "../hooks/use-me-tiet-khuan-workflow";
import { usePermission } from "@/hooks/usePermission";
import { CSSD_UI_ACTION_PRIMARY } from "../shared/ui/cssd-ui-chrome";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
import { MeTietKhuanConfirmDialog } from "../components/batch/me-tiet-khuan-slip-stepper";

export default function MeTietKhuanPage({ suppressShell = false }: { suppressShell?: boolean } = {}) {
  const w = useMeTietKhuanWorkflow();
  const { can } = usePermission();
  const canNhaImplant = can("CSSD_ME_TIET_KHUAN", "nha_implant");
  const [isBatchRecallOpen, setIsBatchRecallOpen] = React.useState(false);
  const confirmDialog = (
    <MeTietKhuanConfirmDialog
      open={Boolean(w.confirmAsk)}
      title={w.confirmAsk?.title || ""}
      body={w.confirmAsk?.body || ""}
      confirmLabel={w.confirmAsk?.confirmLabel || "Xác nhận"}
      danger={w.confirmAsk?.danger}
      onConfirm={() => w.settleConfirm(true)}
      onCancel={() => w.settleConfirm(false)}
    />
  );

  const batchColumns = React.useMemo(
    () =>
      buildMeTietKhuanBatchColumns({
        onContinue: w.openRowForProcess,
      }),
    [w.openRowForProcess],
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
      <div className="animate-in slide-in-from-bottom-6 duration-300">
        <MeTietKhuanCreateStep
          machines={w.machines}
          machineId={w.machineId}
          nguoiNapId={w.nguoiNapId}
          nguoiNapOptions={w.nguoiNapOptions}
          chuongTrinhMa={w.chuongTrinhMa}
          onMachineChange={w.setMachineId}
          onNguoiNapIdChange={w.setNguoiNapId}
          onChuongTrinhMaChange={w.onChuongTrinhMaChange}
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
        hiddenIncompatible={w.hiddenIncompatible}
        chuongTrinh={w.chuongTrinh}
        setChuongTrinh={w.setChuongTrinh}
        chuongOptions={w.chuongOptions}
        chuongTrinhMa={w.chuongTrinhMa}
        onSelectChuongMa={(ma) => {
          const opt = (w.chuongOptions || []).find((o: { ma: string }) => o.ma === ma) || null;
          w.onChuongTrinhMaChange(ma, opt);
        }}
        nhietDo={w.nhietDo}
        setNhietDo={w.setNhietDo}
        apSuat={w.apSuat}
        setApSuat={w.setApSuat}
        thoiGianChuKy={w.thoiGianChuKy}
        setThoiGianChuKy={w.setThoiGianChuKy}
        thongSoVatLy={w.thongSoVatLy}
        setThongSoVatLy={w.setThongSoVatLy}
        ciNgoaiGoi={w.ciNgoaiGoi}
        setCiNgoaiGoi={w.setCiNgoaiGoi}
        ciPcd={w.ciPcd}
        setCiPcd={w.setCiPcd}
        trangThaiBi={w.trangThaiBi}
        setTrangThaiBi={w.setTrangThaiBi}
        ongDoiChung={w.ongDoiChung}
        setOngDoiChung={w.setOngDoiChung}
        ongThu={w.ongThu}
        setOngThu={w.setOngThu}
        gioBatDauU={w.gioBatDauU}
        setGioBatDauU={w.setGioBatDauU}
        gioDoc={w.gioDoc}
        setGioDoc={w.setGioDoc}
        soLoBi={w.soLoBi}
        setSoLoBi={w.setSoLoBi}
        onBackToList={w.backToList}
        onAddItemByCode={(code) => void w.addItem(code)}
        onRemoveItem={(id) => void w.removeItem(id)}
        onConfirmBatDau={() => void w.confirmBatDau()}
        onConfirmKetThucChuTrinh={() => void w.confirmKetThucChuTrinh()}
        onFinishQc={(isPass) => void w.finishQc(isPass)}
        onSubmitBi={(ketQua, biBm02) => void w.submitBi(ketQua, biBm02)}
        onPrintBatch={() => w.activeMe?.id && void w.onPrintBatch({ batchId: w.activeMe.id })}
        isPrintBusy={w.isCssdPrinting}
        onReportIncident={() => setIsBatchRecallOpen(true)}
        suppressShell={suppressShell}
        canNhaImplant={canNhaImplant}
      />
      {printPortal}
      {confirmDialog}
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
      </>
    );

  const listContent = (
    <div className="space-y-[var(--bv103-space-3)]">
      {suppressShell && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-700">Danh sách mẻ tiệt khuẩn</h3>
          <div className="flex flex-wrap gap-2">
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
        </div>
      }
    >
      {listContent}
      {printPortal}
    </CSSDPageShell>
  );
}
