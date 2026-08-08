// src/modules/cssd-erp/components/report/ReportFilters.tsx
"use client";

import React, { useMemo, useState } from "react";
import { RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { useMinWidth } from "@/hooks/use-min-width";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import SearchableSelect from "@/components/shared/SearchableSelect";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

interface Props {
  filters: { from: string; to: string; station: string };
  setFilters: (f: Props["filters"]) => void;
  stations: string[];
  onRefresh?: () => void;
  refreshLoading?: boolean;
}

function fmtShort(iso: string) {
  if (!iso) return "—";
  const p = iso.split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function stationLabel(station: string) {
  if (station === "ALL") return "Tất cả trạm";
  return station.replace(/_/g, " ");
}

const btn =
  "inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 touch-manipulation";

/**
 * Bộ lọc báo cáo CSSD — thin adapter họ AnalyticsFilterBar (kỳ h-9 + SearchableSelect trạm).
 */
export default function ReportFilters({
  filters,
  setFilters,
  stations,
  onRefresh,
  refreshLoading,
}: Props) {
  const isDesktop = useMinWidth(640, false);
  const [open, setOpen] = useState(false);

  useBodyScrollLock(!isDesktop && open);

  const stationOptions = useMemo(
    () => [
      { id: "ALL", label: "Tất cả trạm" },
      ...stations.map((s) => ({ id: s, label: s.replace(/_/g, " ") })),
    ],
    [stations],
  );

  const body = (
    <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="w-7 shrink-0 text-xs font-medium text-slate-500">Kỳ</span>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          aria-label="Từ ngày"
          className={T.analyticsDateInput}
        />
        <span className="text-xs text-slate-300">–</span>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          aria-label="Đến ngày"
          className={T.analyticsDateInput}
        />
      </div>

      <div className="min-w-0 sm:max-w-xs">
        <SearchableSelect
          placeholder="Trạm"
          options={stationOptions}
          value={filters.station || "ALL"}
          onChange={(id) => setFilters({ ...filters, station: id || "ALL" })}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-start gap-1.5 sm:justify-end">
        {onRefresh ? (
          <button
            type="button"
            className={btn}
            disabled={refreshLoading}
            onClick={onRefresh}
            aria-label="Làm mới"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshLoading ? "animate-spin" : ""}`} aria-hidden />
            Làm mới
          </button>
        ) : null}
      </div>
    </div>
  );

  if (!isDesktop && !open) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-9 min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-2 py-1 text-left touch-manipulation"
        >
          <span className="text-xs font-semibold text-slate-800">
            {fmtShort(filters.from)} – {fmtShort(filters.to)}
          </span>
          <span className="truncate text-[11px] font-medium text-slate-500">
            {stationLabel(filters.station)}
          </span>
        </button>
        <button type="button" onClick={() => setOpen(true)} className={btn}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Lọc
        </button>
      </div>
    );
  }

  if (!isDesktop && open) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-900/40 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex max-h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-app-soft)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Bộ lọc báo cáo</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto p-3 custom-scrollbar">{body}</div>
          <div className="border-t border-slate-100 p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-semibold text-white"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <div className="space-y-2">{body}</div>;
}
