"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WashingMachine, Flame, Package, History } from "lucide-react";
import {
  CSSDInstrumentInventoryEmbeddedPage,
  CSSDProcessingLifecyclePage,
  CSSDSterilizationBatchPage,
} from "@/modules/cssd-erp/contexts/processing-lifecycle/entrypoint";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import QRHistoryViewer from "@/modules/cssd-erp/components/history/QRHistoryViewer";
import { CSSD_UI_TAB_ACTIVE, CSSD_UI_TAB_GROUP, CSSD_UI_TAB_IDLE } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

type QuyTrinhTab = "WORKFLOW" | "BATCH" | "KHO" | "TRACE";

const TAB_CONFIG: { key: QuyTrinhTab; label: string; icon: React.ElementType; param: string }[] = [
  { key: "WORKFLOW", label: "Chu trình xử lý", icon: WashingMachine, param: "" },
  { key: "BATCH", label: "Mẻ tiệt khuẩn", icon: Flame, param: "batch" },
  { key: "KHO", label: "Kho dụng cụ", icon: Package, param: "kho" },
  { key: "TRACE", label: "Truy vết", icon: History, param: "trace" },
];

function resolveTab(param: string | null): QuyTrinhTab {
  if (param === "batch") return "BATCH";
  if (param === "kho") return "KHO";
  if (param === "trace") return "TRACE";
  return "WORKFLOW";
}

function CssdQuyTrinhPageInner() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const qrParam = searchParams.get("qr");
  const [activeTab, setActiveTab] = useState<QuyTrinhTab>(() => resolveTab(tabParam));

  React.useEffect(() => {
    setActiveTab(resolveTab(tabParam));
  }, [tabParam]);

  const traceQr = useMemo(
    () => (tabParam === "trace" ? String(qrParam || "").trim().toUpperCase() : ""),
    [tabParam, qrParam],
  );

  return (
    <CSSDPageShell
      title={
        <>
          Chu trình xử lý <span className="text-[#026f17]">dụng cụ</span>
        </>
      }
      subtitle="Quét xác nhận tại trạm, tiệt khuẩn, giám sát kho và hạn sử dụng dụng cụ."
    >
      <div className="space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === key ? CSSD_UI_TAB_ACTIVE : CSSD_UI_TAB_IDLE
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in duration-300">
          {activeTab === "WORKFLOW" ? (
            <CSSDProcessingLifecyclePage suppressShell />
          ) : activeTab === "BATCH" ? (
            <CSSDSterilizationBatchPage suppressShell />
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
