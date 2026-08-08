"use client";

import React from "react";
import { ArrowRight, Clock } from "lucide-react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { DanhMucStat } from "../actions/danh-muc-hybrid.types";
import { quanTriTableChrome as TC } from "../../lib/quan-tri-table-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { formatDateVi } from "@/lib/format-datetime-vi";

export type HubRegistryRow = {
  id: string;
  name: string;
  path: string;
  stats: DanhMucStat;
  icon: React.ReactNode;
  subtitle?: string;
};

function StatusPill({ kind }: { kind: "active" | "empty" }) {
  if (kind === "empty") {
    return (
      <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-400/20">
        Trống
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-lg bg-[var(--surface-success-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--surface-success-text)] ring-1 ring-inset ring-emerald-600/15">
      Có dữ liệu
    </span>
  );
}

const openBtnClass = T.btnPrimary;

export type UnifiedHubRow = HubRegistryRow & {
  domainLabel: string;
  domainClassName: string;
  groupLabel: string;
  tierLabel: string;
  statusKind: "active" | "empty";
};

function DomainBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${className}`}>
      {label}
    </span>
  );
}

export function buildUnifiedHubColumns(onOpen: (path: string) => void): Column<UnifiedHubRow>[] {
  return [
    {
      header: "Danh mục",
      accessorKey: "name",
      sortable: true,
      headerClassName: "min-w-[12rem] w-[40%]",
      cellClassName: "min-w-0",
      cell: (r) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-200/80">
            {r.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`truncate ${TC.cellTitle}`}>{r.name}</span>
              <DomainBadge label={r.domainLabel} className={r.domainClassName} />
              <span className="text-[11px] font-medium text-slate-400">{r.tierLabel}</span>
            </div>
            {r.subtitle ? (
              <div className="truncate font-mono text-[11px] font-medium text-slate-500">{r.subtitle}</div>
            ) : null}
            <div className="text-[11px] text-slate-400">{r.groupLabel}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Số mục",
      accessorKey: "count",
      headerClassName: "w-24 whitespace-nowrap text-right",
      cellClassName: "text-right align-middle",
      cell: (r) => (
        <span className="tabular-nums text-base font-semibold text-[var(--primary)]">{r.stats?.count ?? 0}</span>
      ),
    },
    {
      header: "Cập nhật gần nhất",
      accessorKey: "last",
      headerClassName: "w-36 whitespace-nowrap",
      cellClassName: "whitespace-nowrap align-middle",
      cell: (r) => (
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <time className="text-xs font-medium tabular-nums" dateTime={r.stats?.last}>
            {formatDateVi(r.stats?.last)}
          </time>
        </div>
      ),
    },
    {
      header: "Trạng thái",
      accessorKey: "status",
      headerClassName: "w-28",
      cellClassName: "align-middle",
      cell: (r) => <StatusPill kind={r.statusKind} />,
    },
    {
      header: "",
      accessorKey: "path",
      headerClassName: "w-[8.75rem] text-right",
      cellClassName: "text-right align-middle",
      cell: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(r.path);
          }}
          className={openBtnClass}
        >
          Mở
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      ),
    },
  ];
}
