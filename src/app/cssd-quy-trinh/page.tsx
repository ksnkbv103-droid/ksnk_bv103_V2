"use client";

import React, { Suspense, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { WashingMachine, Flame, Package, History, type LucideIcon } from "lucide-react";
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

const TAB_CONFIG: {
  key: QuyTrinhTab;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  param: string;
}[] = [
  { key: "WORKFLOW", label: "Chu trình xử lý", mobileLabel: "Chu trình", icon: WashingMachine, param: "" },
  { key: "BATCH", label: "Mẻ tiệt khuẩn", mobileLabel: "Mẻ TK", icon: Flame, param: "batch" },
  { key: "KHO", label: "Tình trạng bộ", mobileLabel: "Tình trạng", icon: Package, param: "kho" },
  { key: "TRACE", label: "Truy vết", mobileLabel: "Truy vết", icon: History, param: "trace" },
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
      <div className="space-y-4 sm:space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          {TAB_CONFIG.map(({ key, label, mobileLabel, icon }) => (
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
