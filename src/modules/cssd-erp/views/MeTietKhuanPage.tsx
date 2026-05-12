// src/modules/cssd-erp/views/MeTietKhuanPage.tsx
"use client";

import React from "react";
import { Plus } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";
import CSSDPageShell, { CSSD_PAGE_OUTER } from "../components/layout/cssd-page-shell";
import CSSDSubNav from "../components/navigation/CSSDSubNav";
import MeTietKhuanCreateStep from "../components/batch/me-tiet-khuan-create-step";
import MeTietKhuanProcessStep from "../components/batch/me-tiet-khuan-process-step";
import { meTietKhuanBatchColumns } from "../components/batch/me-tiet-khuan-columns";
import { useMeTietKhuanWorkflow } from "../hooks/use-me-tiet-khuan-workflow";

export default function MeTietKhuanPage() {
  const w = useMeTietKhuanWorkflow();

  if (w.step === "CREATE")
    return (
      <div className={`${CSSD_PAGE_OUTER} animate-in slide-in-from-bottom-10 duration-500`}>
        <CSSDSubNav />
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

  if (w.step === "PROCESS")
    return (
      <MeTietKhuanProcessStep
        activeMe={w.activeMe}
        items={w.items}
        nguoiUnload={w.nguoiUnload}
        setNguoiUnload={w.setNguoiUnload}
        nhietDo={w.nhietDo}
        setNhietDo={w.setNhietDo}
        testBI={w.testBI}
        setTestBI={w.setTestBI}
        testCI={w.testCI}
        setTestCI={w.setTestCI}
        testBD={w.testBD}
        setTestBD={w.setTestBD}
        onBackToList={w.backToList}
        onAddItemByCode={(code) => void w.addItem(code)}
        onFinish={() => void w.finishMe()}
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
          className="flex h-14 items-center gap-3 rounded-2xl bg-[#026f17] px-8 text-[10px] font-black uppercase tracking-widest text-[#FFD700] shadow-xl transition-all hover:scale-[1.02] active:scale-95"
        >
          <Plus size={18} /> Mở mẻ mới
        </button>
      }
    >
      <div className="min-h-[500px] overflow-hidden rounded-[48px] border border-slate-100 bg-white p-2 shadow-sm">
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
