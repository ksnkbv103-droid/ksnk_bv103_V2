// src/modules/cssd-erp/views/MeTietKhuanPage.tsx
// Refactored modular view
"use client";


import React from "react";
import { Plus } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import MeTietKhuanCreateStep from "../components/batch/me-tiet-khuan-create-step";
import MeTietKhuanProcessStep from "../components/batch/me-tiet-khuan-process-step";
import { meTietKhuanBatchColumns } from "../components/batch/me-tiet-khuan-columns";
import { useMeTietKhuanWorkflow } from "../hooks/use-me-tiet-khuan-workflow";
import { CSSD_UI_ACTION_PRIMARY, CSSD_UI_DATA_SURFACE } from "../shared/ui/cssd-ui-chrome";

export default function MeTietKhuanPage() {
  const w = useMeTietKhuanWorkflow();

  if (w.step === "CREATE")
    return (
      <CSSDPageShell title={<span className="text-[#026f17]">Mẻ tiệt khuẩn</span>} subtitle="Thiết lập mẻ mới theo quy trình chuẩn CSSD">
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
      </CSSDPageShell>
    );

  if (w.step === "PROCESS")
    return (
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
        onFinishQc={(isPass) => void w.finishQc(isPass)}
      />
    );

  return (
    <CSSDPageShell
      title={<span className="text-[#026f17]">Mẻ tiệt khuẩn</span>}
      subtitle="Giám sát 6 chốt chặn vô khuẩn — BV103"
      actions={
        <button
          type="button"
          onClick={() => w.setStep("CREATE")}
          className={CSSD_UI_ACTION_PRIMARY}
        >
          <Plus size={18} /> Mở mẻ mới
        </button>
      }
    >
      <div className={CSSD_UI_DATA_SURFACE}>
        <AdvancedDataTable
          columns={meTietKhuanBatchColumns}
          data={w.batches}
          loading={w.loading}
          searchPlaceholder="Tìm theo mã lô..."
          onRowClick={w.openRowForProcess}
        />
      </div>
    </CSSDPageShell>
  );
}
