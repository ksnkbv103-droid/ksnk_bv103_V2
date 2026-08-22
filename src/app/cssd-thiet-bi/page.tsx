"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, List, Wrench } from "lucide-react";
import { CSSDMaintenancePage } from "@/modules/cssd-erp/contexts/maintenance/entrypoint";
import ThietBiFleetPanel from "@/modules/cssd-erp/components/equipment/thiet-bi-fleet-panel";
import ThietBiVanHanhPanel from "@/modules/cssd-erp/components/equipment/thiet-bi-van-hanh-panel";
import CSSDPageShell from "@/modules/cssd-erp/components/layout/cssd-page-shell";
import { CssdHorizTabButton } from "@/modules/cssd-erp/components/layout/CssdHorizTabButton";
import { CSSD_UI_TAB_GROUP } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

type ThietBiTab = "FLEET" | "MAINTENANCE" | "VAN_HANH";

function resolveTab(tabParam: string | null): ThietBiTab {
  if (tabParam === "maintenance" || tabParam === "bao-tri") return "MAINTENANCE";
  if (tabParam === "van-hanh" || tabParam === "history") return "VAN_HANH";
  return "FLEET";
}

function tabParamOf(tab: ThietBiTab): string {
  if (tab === "MAINTENANCE") return "maintenance";
  if (tab === "VAN_HANH") return "van-hanh";
  return "";
}

function CssdThietBiPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ThietBiTab>(resolveTab(tabParam));

  useEffect(() => {
    setActiveTab(resolveTab(tabParam));
  }, [tabParam]);

  const goTab = useCallback(
    (tab: ThietBiTab) => {
      setActiveTab(tab);
      const p = tabParamOf(tab);
      router.replace(p ? `/cssd-thiet-bi?tab=${p}` : "/cssd-thiet-bi");
    },
    [router],
  );

  return (
    <CSSDPageShell
      title="Thiết bị KSNK"
      actions={
        <Link
          href="/quan-tri-he-thong/danh-muc/thiet-bi"
          className={`${bv103LayoutChrome.btnSecondary} gap-1.5 px-2.5`}
        >
          Sửa tại Quản trị
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      }
    >
      <div className="space-y-4 sm:space-y-6">
        <div className={CSSD_UI_TAB_GROUP}>
          <CssdHorizTabButton
            active={activeTab === "FLEET"}
            onClick={() => goTab("FLEET")}
            icon={List}
            label="Danh sách máy"
            mobileLabel="Danh sách"
          />
          <CssdHorizTabButton
            active={activeTab === "MAINTENANCE"}
            onClick={() => goTab("MAINTENANCE")}
            icon={Wrench}
            label="Bảo dưỡng & sửa chữa"
            mobileLabel="Bảo dưỡng"
          />
        </div>
        <button
          type="button"
          onClick={() => goTab(activeTab === "VAN_HANH" ? "FLEET" : "VAN_HANH")}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
        >
          {activeTab === "VAN_HANH" ? "← Về danh sách máy" : "Xem thêm: lịch sử mẻ theo máy"}
        </button>

        <div className="animate-in fade-in duration-300">
          {activeTab === "FLEET" ? (
            <ThietBiFleetPanel />
          ) : activeTab === "MAINTENANCE" ? (
            <CSSDMaintenancePage suppressShell={true} />
          ) : (
            <ThietBiVanHanhPanel />
          )}
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
