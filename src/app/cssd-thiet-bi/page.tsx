"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wrench, Flame } from "lucide-react";
import { CSSDMaintenancePage } from "@/modules/cssd-erp/contexts/maintenance/entrypoint";
import { CssdThietBiMdmBanner } from "@/modules/cssd-erp/components/catalog/CssdCatalogMdmBanner";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import CssdModuleChrome from "@/modules/cssd-erp/components/layout/CssdModuleChrome";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
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
          Máy móc &amp; Thiết bị <span className="text-[#026f17]">KSNK</span>
        </>
      }
      subtitle="Bảo dưỡng vận hành tại CSSD; danh mục máy CRUD tại Quản trị."
    >
      <CssdModuleChrome>
        <Link
          href={CSSD_ROUTES.batch}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-900 hover:bg-amber-100"
        >
          <Flame className="h-4 w-4 shrink-0" aria-hidden />
          Mẻ tiệt khuẩn
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
            Danh mục (Quản trị)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("MAINTENANCE")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
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
