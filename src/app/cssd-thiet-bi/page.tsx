"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wrench } from "lucide-react";
import { CSSDMaintenancePage } from "@/modules/cssd-erp/contexts/maintenance/entrypoint";
import { CssdThietBiMdmBanner } from "@/modules/cssd-erp/components/catalog/CssdCatalogMdmBanner";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

type ThietBiTab = "CATALOG" | "MAINTENANCE";

function CssdThietBiPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ThietBiTab>(
    tabParam === "maintenance" || tabParam === "bao-tri" ? "MAINTENANCE" : "CATALOG",
  );

  useEffect(() => {
    if (tabParam === "maintenance" || tabParam === "bao-tri") setActiveTab("MAINTENANCE");
    else if (tabParam === "catalog" || !tabParam) setActiveTab("CATALOG");
  }, [tabParam]);

  return (
    <CSSDPageShell
      title={
        <>
          Máy móc &amp; Thiết bị <span className="text-[var(--primary)]">KSNK</span>
        </>
      }
      subtitle="Bảo dưỡng vận hành tại CSSD; danh mục máy CRUD tại Quản trị."
    >
      <div className="space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          <button
            type="button"
            onClick={() => setActiveTab("CATALOG")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-semibold uppercase tracking-wide transition-all ${
              activeTab === "CATALOG" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            Danh mục (Quản trị)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MAINTENANCE")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[11px] font-semibold uppercase tracking-wide transition-all ${
              activeTab === "MAINTENANCE" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <Wrench size={14} /> Bảo dưỡng &amp; sửa chữa
          </button>
        </div>

        <div className="animate-in fade-in duration-300">
          {activeTab === "CATALOG" ? <CssdThietBiMdmBanner /> : <CSSDMaintenancePage suppressShell={true} />}
        </div>
      </div>
    </CSSDPageShell>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        </div>
      }
    >
      <CssdThietBiPageInner />
    </Suspense>
  );
}
