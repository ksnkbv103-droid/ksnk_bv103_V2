"use client";

import React from "react";
import { ArrowRight, ClipboardList, Droplets, ShieldHalf } from "lucide-react";
import AdvancedDataTable from "@/components/shared/AdvancedDataTable";

interface ChecklistTemplateTableProps {
  data: any[];
  onSelect: (template: any) => void;
  onSearch: (term: string) => void;
  onSort: (key: any) => void;
  searchTerm: string;
  loading?: boolean;
}

function TemplateTypeIcon({ loai }: { loai?: string }) {
  const k = String(loai || "").toUpperCase();
  const Icon = k === "VST" ? Droplets : k === "HAI" ? ShieldHalf : ClipboardList;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200/80 transition-colors group-hover:bg-[var(--primary-light)] group-hover:ring-[var(--primary)]/20">
      <Icon className="h-5 w-5 text-[var(--primary)]" aria-hidden />
    </div>
  );
}

export default function ChecklistTemplateTable({
  data,
  onSelect,
  onSearch,
  onSort,
  searchTerm,
  loading,
}: ChecklistTemplateTableProps) {
  return (
    <div className="animate-in fade-in duration-300 space-y-5">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 no-print">
        <h3 className="text-base font-semibold text-slate-900">Danh mục bảng kiểm</h3>
      </div>

      <AdvancedDataTable
        columns={[
          {
            header: "Bảng kiểm",
            accessorKey: "ten_bang_kiem",
            sortable: true,
            cell: (t) => (
              <div className="flex items-center gap-3 py-1.5">
                <TemplateTypeIcon loai={t.loai_bang_kiem} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-snug text-slate-900 group-hover:text-[var(--primary)]">
                    {t.ten_bk || t.ten_bang_kiem || t.title}
                  </p>
                  <p className="truncate font-mono text-[11px] font-medium text-slate-500">{t.ma_bk || t.ma_bang_kiem || t.id}</p>
                </div>
              </div>
            ),
          },
          {
            header: "Phân loại",
            accessorKey: "loai_bang_kiem",
            sortable: true,
            cell: (t) => (
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-900/5">
                {t.loai_bang_kiem || t.category || "—"}
              </span>
            ),
          },
          {
            header: "",
            accessorKey: "id",
            cell: (t) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(t);
                }}
                className="app-shell-focus inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
              >
                Bắt đầu
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            ),
          },
        ]}
        data={data}
        loading={loading}
        onSearch={onSearch}
        onSort={onSort}
        searchValue={searchTerm}
        searchPlaceholder="Tìm kiếm bảng kiểm..."
        enableMultiSelect={false}
        onRowClick={(t) => onSelect(t)}
      />
    </div>
  );
}
