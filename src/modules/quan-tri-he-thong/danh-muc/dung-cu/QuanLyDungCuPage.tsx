"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Database, LayoutGrid } from "lucide-react";
import { LoaiDungCuPageContent } from "./LoaiDungCuPage";
import { BoDungCuPageContent } from "./BoDungCuPage";
import { DmTabGuard } from "../views/dm-tab-guard";
import { DungCuWorkflowGuide } from "./dung-cu-workflow-guide";
import { quanTriDungCuHref, type DungCuTab } from "@/lib/master-data/quan-tri-paths";
import { useModulePermission } from "@/hooks/useModulePermission";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

const dungCuTabBtn = (active: boolean) =>
  `${C.navTabBtn} px-5 text-[11px] font-bold uppercase tracking-wider ${
    active ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
  }`;

function parseDungCuTab(raw: string | null): DungCuTab {
  if (raw === "bo" || raw === "chi-tiet") return "bo";
  return "loai";
}

export default function QuanLyDungCuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DungCuTab>(() => parseDungCuTab(searchParams.get("tab")));

  useEffect(() => {
    const raw = searchParams.get("tab");
    setActiveTab(parseDungCuTab(raw));
    if (raw === "chi-tiet") {
      router.replace(quanTriDungCuHref("bo"), { scroll: false });
    }
  }, [searchParams, router]);

  const selectTab = (tab: DungCuTab) => {
    setActiveTab(tab);
    router.replace(quanTriDungCuHref(tab), { scroll: false });
  };

  const { loading: permLoading, allowed: loaiAllowed } = useModulePermission("LOAI_DC");
  const { allowed: boAllowed } = useModulePermission("BO_DC");
  const { allowed: leAllowed } = useModulePermission("DC_LE");

  if (permLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!loaiAllowed.view && !boAllowed.view && !leAllowed.view) {
    return (
      <div className={`mx-auto max-w-xl ${C.panelSurface} p-10 text-center`}>
        <p className="text-sm font-semibold text-slate-500">Không có quyền truy cập</p>
        <p className="mt-2 text-xs font-medium text-slate-500">
          Cần quyền xem loại dụng cụ, bộ dụng cụ hoặc thành phần bộ.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-6 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--primary)] flex items-center gap-3">
            <LayoutGrid size={24} aria-hidden /> Quản lý dụng cụ
          </h1>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            Định nghĩa loại và bộ — thành phần sửa trong từng bộ
          </p>
        </div>

        <div className={`${C.navTabStrip} w-full max-sm:rounded-xl sm:w-fit`} role="tablist" aria-label="Phân hệ dụng cụ">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "loai"}
            onClick={() => selectTab("loai")}
            className={dungCuTabBtn(activeTab === "loai")}
          >
            <LayoutGrid size={14} aria-hidden /> Loại dụng cụ
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "bo"}
            onClick={() => selectTab("bo")}
            className={dungCuTabBtn(activeTab === "bo")}
          >
            <Database size={14} aria-hidden /> Bộ dụng cụ
          </button>
        </div>
      </div>

      <DungCuWorkflowGuide />

      <div className="transition-all duration-300">
        {activeTab === "loai" && (
          <DmTabGuard moduleKey="LOAI_DC" label="loại dụng cụ">
            <LoaiDungCuPageContent />
          </DmTabGuard>
        )}
        {activeTab === "bo" &&
          (boAllowed.view || leAllowed.view ? (
            <BoDungCuPageContent />
          ) : (
            <DmTabGuard moduleKey="BO_DC" label="bộ dụng cụ">
              <BoDungCuPageContent />
            </DmTabGuard>
          ))}
      </div>
    </div>
  );
}
