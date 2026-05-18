"use client";

import React, { useState } from "react";
import { WashingMachine, Package } from "lucide-react";
import CSSDERPPage from "@/modules/cssd-erp/views/CSSDERPPage";
import KhoDungCuPage from "@/modules/cssd-erp/views/KhoDungCuPage";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"WORKFLOW" | "KHO">("WORKFLOW");

  return (
    <CSSDPageShell
      title={
        <>
          Quy trình &amp; Kho <span className="text-[#026f17]">CSSD</span>
        </>
      }
      subtitle="Quét mã QR tại các trạm và giám sát vòng quay, vị trí tồn kho thực tế của từng bộ dụng cụ."
    >
      <div className="space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          <button
            type="button"
            onClick={() => setActiveTab("WORKFLOW")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "WORKFLOW" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <WashingMachine size={14} /> Quét xử lý trạm làm việc
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("KHO")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "KHO" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <Package size={14} /> Giám sát kho dụng cụ (FEFO)
          </button>
        </div>

        <div className="animate-in fade-in duration-300">
          {activeTab === "WORKFLOW" ? (
            <CSSDERPPage suppressShell />
          ) : (
            <KhoDungCuPage suppressShell />
          )}
        </div>
      </div>
    </CSSDPageShell>
  );
}
