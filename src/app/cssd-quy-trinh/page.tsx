"use client";

import React, { Suspense, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { WashingMachine, Flame, Package, History, Search, type LucideIcon } from "lucide-react";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import { CSSD_UI_TAB_GROUP } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

type QuyTrinhTab = "WORKFLOW" | "BATCH" | "KHO" | "TRACE";

function TabPanelSkeleton() {
  return (
    <div className="flex h-[40vh] items-center justify-center" aria-busy="true">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--primary)]" />
    </div>
  );
}

const CSSDProcessingLifecyclePage = dynamic(
  () =>
    import("@/modules/cssd-erp/contexts/processing-lifecycle/entrypoint").then((m) => ({
      default: m.CSSDProcessingLifecyclePage,
    })),
  { ssr: false, loading: () => <TabPanelSkeleton /> },
);

const CSSDSterilizationBatchPage = dynamic(
  () =>
    import("@/modules/cssd-erp/contexts/processing-lifecycle/entrypoint").then((m) => ({
      default: m.CSSDSterilizationBatchPage,
    })),
  { ssr: false, loading: () => <TabPanelSkeleton /> },
);

const CSSDInstrumentInventoryEmbeddedPage = dynamic(
  () =>
    import("@/modules/cssd-erp/contexts/processing-lifecycle/entrypoint").then((m) => ({
      default: m.CSSDInstrumentInventoryEmbeddedPage,
    })),
  { ssr: false, loading: () => <TabPanelSkeleton /> },
);

const QRHistoryViewer = dynamic(
  () => import("@/modules/cssd-erp/components/history/QRHistoryViewer"),
  { ssr: false, loading: () => <TabPanelSkeleton /> },
);

const WORK_TABS: {
  key: Exclude<QuyTrinhTab, "TRACE">;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  param: string;
}[] = [
  { key: "WORKFLOW", label: "Chu trình", mobileLabel: "Chu trình", icon: WashingMachine, param: "" },
  { key: "BATCH", label: "Mẻ", mobileLabel: "Mẻ", icon: Flame, param: "batch" },
  { key: "KHO", label: "Kho", mobileLabel: "Kho", icon: Package, param: "kho" },
];

const TAB_CONFIG = [
  ...WORK_TABS,
  { key: "TRACE" as const, label: "Truy vết", mobileLabel: "Truy vết", icon: History, param: "trace" },
];

function resolveTab(param: string | null): QuyTrinhTab {
  if (param === "batch") return "BATCH";
  if (param === "kho") return "KHO";
  if (param === "trace") return "TRACE";
  return "WORKFLOW";
}

function CssdQuyTrinhPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const qrParam = searchParams.get("qr");
  const activeTab = useMemo(() => resolveTab(tabParam), [tabParam]);

  const setTab = useCallback(
    (key: QuyTrinhTab) => {
      const cfg = TAB_CONFIG.find((t) => t.key === key);
      const param = cfg?.param ?? "";
      const qs = new URLSearchParams();
      if (param) qs.set("tab", param);
      if (key === "TRACE" && qrParam) qs.set("qr", qrParam);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      router.replace(`/cssd-quy-trinh${suffix}`, { scroll: false });
    },
    [router, qrParam],
  );

  const traceQr = useMemo(
    () => (tabParam === "trace" ? String(qrParam || "").trim().toUpperCase() : ""),
    [tabParam, qrParam],
  );

  return (
    <CSSDPageShell
      title={
        <>
          Chu trình xử lý <span className="text-[var(--primary)]">dụng cụ</span>
        </>
      }
    >
      <div className="bv103-stack-page">
        <div className="flex flex-wrap items-center gap-2">
          <div className={CSSD_UI_TAB_GROUP}>
            {WORK_TABS.map(({ key, label, mobileLabel, icon }) => (
              <CssdHorizTabButton
                key={key}
                active={activeTab === key}
                onClick={() => setTab(key)}
                label={label}
                mobileLabel={mobileLabel}
                icon={icon}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTab("TRACE")}
            title="Truy vết QR"
            aria-label="Truy vết"
            aria-pressed={activeTab === "TRACE"}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border transition-colors ${
              activeTab === "TRACE"
                ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <Search className="h-4 w-4" aria-hidden />
          </button>
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
    <Suspense fallback={<TabPanelSkeleton />}>
      <CssdQuyTrinhPageInner />
    </Suspense>
  );
}
