"use client";

import React, { useState } from "react";
import { Settings2, Wrench } from "lucide-react";
import { CSSDMaintenancePage } from "@/modules/cssd-erp/contexts/maintenance/entrypoint";
import ThietBiMasterPage from "@/modules/quan-tri-he-thong/danh-muc/thiet-bi/ThietBiMasterPage";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "MAINTENANCE">("CATALOG");

  return (
    <CSSDPageShell
      title={
        <>
          Máy móc & Thiết bị <span className="text-[#026f17]">KSNK</span>
        </>
      }
      subtitle="Quản lý danh mục thiết bị và theo dõi lịch sử bảo dưỡng, sửa chữa."
    >
      <div className="space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "CATALOG" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <Settings2 size={14} /> Danh mục Thiết bị KSNK
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MAINTENANCE")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "MAINTENANCE" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <Wrench size={14} /> Lịch sử bảo dưỡng & Sửa chữa
          </button>
        </div>

        <div className="animate-in fade-in duration-300">
          {activeTab === "CATALOG" ? (
            <ThietBiMasterPage suppressHeader={true} />
          ) : (
            <CSSDMaintenancePage suppressShell={true} />
          )}
        </div>
      </div>
    </CSSDPageShell>
  );
}
