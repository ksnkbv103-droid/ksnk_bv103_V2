"use client";

import React from "react";
import { ArrowRight, Clock } from "lucide-react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { DanhMucStat } from "../actions/danh-muc-hybrid.types";

export type MasterCardRow = {
  id: string;
  name: string;
  path: string;
  stats?: DanhMucStat;
  icon: React.ReactNode;
};

export type HubRegistryRow = {
  id: string;
  name: string;
  path: string;
  stats: DanhMucStat;
  icon: React.ReactNode;
  subtitle?: string;
};

function StatusPill() {
  return (
    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
      Hoạt động
    </span>
  );
}

export function buildMasterHubColumns(onOpen: (path: string) => void): Column<MasterCardRow>[] {
  return [
    {
      header: "Danh mục",
      accessorKey: "name",
      cell: (r) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200/80">
            {r.icon}
          </div>
          <span className="text-sm font-semibold leading-snug text-slate-900">{r.name}</span>
        </div>
      ),
    },
    {
      header: "Số mục",
      accessorKey: "count",
      sortable: true,
      cell: (r) => (
        <span className="tabular-nums text-base font-semibold text-[var(--primary)]">{r.stats?.count ?? 0}</span>
      ),
    },
    {
      header: "Cập nhật gần nhất",
      accessorKey: "last",
      cell: (r) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <time className="text-xs font-medium tabular-nums" dateTime={r.stats?.last}>
            {r.stats?.last ? new Date(r.stats.last).toLocaleDateString("vi-VN") : "—"}
          </time>
        </div>
      ),
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: () => <StatusPill />,
    },
    {
      header: "",
      accessorKey: "path",
      cell: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(r.path);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Mở
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ),
    },
  ];
}

export function buildRegistryColumns(onOpen: (path: string) => void): Column<HubRegistryRow>[] {
  return [
    {
      header: "Danh mục",
      accessorKey: "name",
      cell: (r) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200/80">
            {r.icon}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{r.name}</div>
            {r.subtitle ? (
              <div className="truncate font-mono text-[11px] font-medium text-slate-500">{r.subtitle}</div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      header: "Số mục",
      accessorKey: "count",
      sortable: true,
      cell: (r) => (
        <span className="tabular-nums text-base font-semibold text-[var(--primary)]">{r.stats?.count ?? 0}</span>
      ),
    },
    {
      header: "Cập nhật gần nhất",
      accessorKey: "last",
      cell: (r) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <time className="text-xs font-medium tabular-nums" dateTime={r.stats?.last}>
            {r.stats?.last ? new Date(r.stats.last).toLocaleDateString("vi-VN") : "—"}
          </time>
        </div>
      ),
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      cell: () => <StatusPill />,
    },
    {
      header: "",
      accessorKey: "path",
      cell: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(r.path);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          Mở
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ),
    },
  ];
}
