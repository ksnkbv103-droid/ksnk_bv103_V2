// src/modules/cssd-erp/components/report/ReportFilters.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Calendar, SlidersHorizontal, X } from "lucide-react";
import { useMinWidth } from "@/hooks/use-min-width";

interface Props {
  filters: { from: string; to: string; station: string };
  setFilters: (f: Props["filters"]) => void;
  stations: string[];
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

const dateInput =
  "w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-sm outline-none focus:border-[var(--primary)] transition-all sm:h-14 sm:pl-5 sm:border-2 sm:border-slate-50 sm:rounded-2xl";

/**
 * Bộ lọc báo cáo CSSD — mobile: chip tóm tắt + panel; desktop: form đầy đủ.
 */
export default function ReportFilters({ filters, setFilters, stations }: Props) {
  const isDesktop = useMinWidth(640, false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isDesktop || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isDesktop, open]);

  const body = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-500 px-1">Từ ngày</label>
        <div className="relative">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className={dateInput}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none sm:right-4" size={18} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-500 px-1">Đến ngày</label>
        <div className="relative">
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className={dateInput}
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none sm:right-4" size={18} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-500 px-1">Khu vực / Trạm</label>
        <select
          value={filters.station}
          onChange={(e) => setFilters({ ...filters, station: e.target.value })}
          className={`${dateInput} appearance-none`}
        >
          <option value="ALL">Tất cả các trạm</option>
          {stations.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  if (!isDesktop && !open) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-9 min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-2 py-1 text-left touch-manipulation"
        >
          <span className="text-xs font-semibold text-slate-800">
            {fmtShort(filters.from)} – {fmtShort(filters.to)}
          </span>
          <span className="truncate text-[11px] font-medium text-slate-500">{stationLabel(filters.station)}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 touch-manipulation"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Lọc
        </button>
      </div>
    );
  }

  if (!isDesktop && open) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-slate-900/40 p-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex max-h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
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

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm space-y-3 sm:rounded-2xl sm:p-6 sm:space-y-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bộ lọc báo cáo</p>
      {body}
    </div>
  );
}
