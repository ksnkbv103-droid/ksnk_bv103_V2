"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Database, List } from "lucide-react";
import { LoaiDungCuPageContent } from "./LoaiDungCuPage";
import { BoDungCuPageContent } from "./BoDungCuPage";
import { DungCuChiTietPageContent } from "./dung-cu-chi-tiet-page-content";
import { DmMasterPageGuard } from "../views/dm-master-page-guard";
import { quanTriDungCuHref, type DungCuTab } from "@/lib/master-data/quan-tri-paths";

function parseDungCuTab(raw: string | null): DungCuTab {
  if (raw === "bo" || raw === "chi-tiet") return raw;
  return "loai";
}

export default function QuanLyDungCuPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DungCuTab>(() => parseDungCuTab(searchParams.get("tab")));

  useEffect(() => {
    setActiveTab(parseDungCuTab(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = (tab: DungCuTab) => {
    setActiveTab(tab);
    router.replace(quanTriDungCuHref(tab), { scroll: false });
  };

  return (
    <DmMasterPageGuard moduleKey="LOAI_DC" label="Quản lý dụng cụ">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-[var(--radius-shell)] border border-slate-200/90 bg-white p-6 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.03] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--primary)] flex items-center gap-3">
              <LayoutGrid size={24} aria-hidden /> Quản lý dụng cụ
            </h1>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider mt-1">
              Master Data • đồng bộ CSSD
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100/90 p-1.5 rounded-xl w-fit" role="tablist" aria-label="Phân hệ dụng cụ">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "loai"}
              onClick={() => selectTab("loai")}
              className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "loai"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid size={14} aria-hidden /> Loại dụng cụ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "bo"}
              onClick={() => selectTab("bo")}
              className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "bo"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database size={14} aria-hidden /> Bộ dụng cụ
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "chi-tiet"}
              onClick={() => selectTab("chi-tiet")}
              className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
                activeTab === "chi-tiet"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <List size={14} aria-hidden /> Thành phần
            </button>
          </div>
        </div>

        <div className="transition-all duration-300">
          {activeTab === "loai" && <LoaiDungCuPageContent />}
          {activeTab === "bo" && <BoDungCuPageContent />}
          {activeTab === "chi-tiet" && <DungCuChiTietPageContent />}
        </div>
      </div>
    </DmMasterPageGuard>
  );
}
