"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { WashingMachine, Package, Flame, History } from "lucide-react";
import {
  CSSDInstrumentInventoryEmbeddedPage,
  CSSDProcessingLifecyclePage,
} from "@/modules/cssd-erp/contexts/processing-lifecycle/entrypoint";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import CssdModuleChrome from "@/modules/cssd-erp/components/layout/CssdModuleChrome";
import QRHistoryViewer from "@/modules/cssd-erp/components/history/QRHistoryViewer";
import { CSSD_ROUTES } from "@/lib/cssd-routes";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

type QuyTrinhTab = "WORKFLOW" | "KHO" | "TRACE";

function CssdQuyTrinhPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const qrParam = searchParams.get("qr");
  const initialTab: QuyTrinhTab =
    tabParam === "kho" ? "KHO" : tabParam === "trace" ? "TRACE" : "WORKFLOW";
  const [activeTab, setActiveTab] = useState<QuyTrinhTab>(initialTab);

  React.useEffect(() => {
    if (tabParam === "kho") setActiveTab("KHO");
    else if (tabParam === "trace") setActiveTab("TRACE");
    else setActiveTab("WORKFLOW");
  }, [tabParam]);

  const traceQr = useMemo(
    () => (tabParam === "trace" ? String(qrParam || "").trim().toUpperCase() : ""),
    [tabParam, qrParam],
  );

  return (
    <CSSDPageShell
      title={
        <>
          Quy trình &amp; Kho <span className="text-[#026f17]">CSSD</span>
        </>
      }
      subtitle="Quét mã QR tại các trạm, truy vết lịch sử và giám sát vòng quay / FEFO từng bộ dụng cụ."
    >
      <CssdModuleChrome>
        <Link
          href={CSSD_ROUTES.erpBatch}
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
            onClick={() => setActiveTab("WORKFLOW")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "WORKFLOW" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <WashingMachine size={14} /> Quét xử lý trạm
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("KHO")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "KHO" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <Package size={14} /> Kho dụng cụ (FEFO)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("TRACE")}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "TRACE" ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
            }`}
          >
            <History size={14} /> Truy vết QR
          </button>
        </div>

        <div className="animate-in fade-in duration-300">
          {activeTab === "WORKFLOW" ? (
            <CSSDProcessingLifecyclePage suppressShell />
          ) : activeTab === "KHO" ? (
            <CSSDInstrumentInventoryEmbeddedPage suppressShell />
          ) : (
            <QRHistoryViewer initialQr={traceQr || undefined} />
          )}
        </div>
      </div>
    </CSSDPageShell>
  );
}

export default function CssdQuyTrinhPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
        </div>
      }
    >
      <CssdQuyTrinhPageInner />
    </Suspense>
  );
}
