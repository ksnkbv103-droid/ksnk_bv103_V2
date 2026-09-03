"use client";

import React from "react";
import { ArrowRight, Clock, Layers } from "lucide-react";
import type { Column } from "@/components/shared/AdvancedDataTable";
import type { DanhMucStat } from "../actions/danh-muc-hybrid.types";
import {
  DANH_MUC_DOMAIN_BADGE,
  DANH_MUC_HUB_GROUP_LABELS,
  type DanhMucHubRow,
} from "@/lib/master-data/danh-muc-hub-catalog";
import { quanTriTableChrome as TC } from "../../lib/quan-tri-table-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { formatDateVi } from "@/lib/format-datetime-vi";

export type HubRegistryRow = {
  id: string;
  name: string;
  path: string;
  stats: DanhMucStat;
  icon: React.ReactNode;
};

function StatusText({ kind }: { kind: "active" | "empty" }) {
  if (kind === "empty") {
    return <span className={TC.statusMuted}>Trống</span>;
  }
  return <span className={TC.statusOk}>Có dữ liệu</span>;
}

const openBtnClass = T.btnPrimary;

export type UnifiedHubRow = HubRegistryRow & {
  domainLabel: string;
  groupLabel: string;
  statusKind: "active" | "empty";
};

export function toUnifiedHubRow(row: DanhMucHubRow, icon?: React.ReactNode): UnifiedHubRow {
  const badge = DANH_MUC_DOMAIN_BADGE[row.domain];
  const count = row.stats?.count ?? 0;
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    stats: row.stats || { count: 0 },
    icon: icon ?? <Layers className="h-5 w-5 text-teal-600" />,
    domainLabel: badge.label,
    groupLabel: DANH_MUC_HUB_GROUP_LABELS[row.group],
    statusKind: count > 0 ? "active" : "empty",
  };
}

function DomainText({ label }: { label: string }) {
  return <span className={TC.statusMuted}>{label}</span>;
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
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`truncate ${TC.cellTitle}`}>{r.name}</span>
            <DomainText label={r.domainLabel} />
          </div>
          <div className="text-[11px] text-slate-400">{r.groupLabel}</div>
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
      cell: (r) => <StatusText kind={r.statusKind} />,
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
