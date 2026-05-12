"use client";

import React from "react";
import { Database, Layers, ShieldCheck } from "lucide-react";

type TabId = "DANH_MUC" | "DM_REGISTRY" | "PHAN_QUYEN";

type Props = {
  active: TabId;
  onChange: (t: TabId) => void;
  /** Hai tab danh mục cần `DANH_MUC.view`. */
  canAccessDmTabs: boolean;
  /** Tab ma trận: cần admin / email tin cậy hoặc `PHAN_QUYEN` + edit — khớp `ensureRbacAdmin`. */
  canConfigureRbac: boolean;
};

const tabBase =
  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 sm:flex-initial sm:px-5 touch-manipulation";

export default function QuanTriDanhMucTabStrip({ active, onChange, canAccessDmTabs, canConfigureRbac }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Khu vực quản trị danh mục"
      className="flex flex-wrap gap-1 rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-inner"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "DANH_MUC"}
        id="tab-danhmuc-hub"
        disabled={!canAccessDmTabs}
        title={canAccessDmTabs ? undefined : "Cần quyền Xem module Danh mục"}
        className={`${tabBase} ${active === "DANH_MUC" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("DANH_MUC")}
      >
        <Database className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="truncate">Trung tâm danh mục</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "DM_REGISTRY"}
        id="tab-dm-registry"
        disabled={!canAccessDmTabs}
        title={canAccessDmTabs ? undefined : "Cần quyền Xem module Danh mục"}
        className={`${tabBase} ${active === "DM_REGISTRY" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("DM_REGISTRY")}
      >
        <Layers className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="truncate">Danh mục chuyên biệt</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "PHAN_QUYEN"}
        id="tab-phan-quyen"
        disabled={!canConfigureRbac}
        title={canConfigureRbac ? undefined : "Cần quyền Sửa PHAN_QUYEN hoặc vai trò quản trị để chỉnh ma trận"}
        className={`${tabBase} ${active === "PHAN_QUYEN" ? "bg-white text-[var(--primary)] shadow-sm ring-1 ring-slate-200/80" : "text-slate-500 hover:bg-white/60 hover:text-slate-800"} disabled:cursor-not-allowed disabled:opacity-45`}
        onClick={() => onChange("PHAN_QUYEN")}
      >
        <ShieldCheck className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
        <span className="truncate">Phân quyền</span>
      </button>
    </div>
  );
}
