"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, History, QrCode } from "lucide-react";
import { CSSDInstrumentCatalogPage } from "@/modules/cssd-erp/contexts/instrument-catalog/entrypoint";
import InventoryHistoryTable from "@/modules/cssd-erp/components/inventory/InventoryHistoryTable";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import CssdModuleChrome from "@/modules/cssd-erp/components/layout/CssdModuleChrome";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

export default function Page() {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "HISTORY">("CATALOG");

  return (
    <CSSDPageShell
      title={
        <>
          Dụng cụ phẫu thuật <span className="text-[#026f17]">CSSD</span>
        </>
      }
      subtitle="Danh mục bộ & chi tiết, điều chuyển cấu phần giữa QR, báo hỏng/mất và lịch sử luân chuyển."
    >
      <CssdModuleChrome>
        <Link
          href={`${CSSD_ROUTES.quyTrinh}?tab=kho`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <QrCode className="h-4 w-4 shrink-0 text-[#026f17]" aria-hidden />
          Kho FEFO &amp; in nhãn QR
        </Link>
      </CssdModuleChrome>

      <div className="space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "CATALOG" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <BookOpen size={14} /> Danh mục bộ &amp; dụng cụ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "HISTORY" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <History size={14} /> Lịch sử luân chuyển
          </button>
        </div>

        <div className="animate-in fade-in duration-300">
          {activeTab === "CATALOG" ? (
            <CSSDInstrumentCatalogPage suppressShell />
          ) : (
            <InventoryHistoryTable />
          )}
        </div>
      </div>
    </CSSDPageShell>
  );
}
