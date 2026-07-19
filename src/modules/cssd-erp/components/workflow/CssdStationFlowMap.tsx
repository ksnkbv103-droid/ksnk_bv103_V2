"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MapPinned, RefreshCw } from "lucide-react";
import type { Station } from "../../types/cssd.types";
import { WORKFLOW_STEPS } from "../../workflow/domain/cssd-stations";
import { getCssdStationFlowMap, type StationFlowMapCell } from "../../actions/cssd-read.actions";
import { CSSD_UI_SECTION_TITLE } from "../../shared/ui/cssd-ui-chrome";

const STATION_SHORT: Record<Station, string> = {
  TIEP_NHAN: "Tiếp nhận",
  LAM_SACH: "Làm sạch",
  QC: "QC",
  DONG_GOI: "Đóng gói",
  TIET_KHUAN: "Tiệt khuẩn",
  CAP_PHAT: "Cấp phát",
};

type Props = {
  activeStation?: Station | null;
  onSelectStation?: (station: Station) => void;
  pollMs?: number;
};

export default function CssdStationFlowMap({
  activeStation,
  onSelectStation,
  pollMs = 15000,
}: Props) {
  const [cells, setCells] = useState<StationFlowMapCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCssdStationFlowMap();
      if (!res.success) throw new Error(res.error);
      setCells(res.cells);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được bản đồ trạm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    if (pollMs <= 0) return;
    const t = setInterval(() => void load(), pollMs);
    return () => clearInterval(t);
  }, [load, pollMs]);

  const ordered =
    cells.length > 0
      ? cells
      : WORKFLOW_STEPS.map((station) => ({
          station,
          count: 0,
          redAlertCount: 0,
          frozenCount: 0,
        }));

  return (
    <section className="space-y-2" aria-label="Bản đồ 6 trạm">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className={`${CSSD_UI_SECTION_TITLE} flex items-center gap-2`}>
          <MapPinned size={14} className="text-[var(--primary)]" aria-hidden />
          Bản đồ luồng 6 trạm
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
          disabled={loading}
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} aria-hidden />
          Làm mới
        </button>
      </div>
      {error ? <p className="px-1 text-[11px] font-medium text-rose-600">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {ordered.map((cell) => {
          const isActive = activeStation === cell.station;
          const clickable = Boolean(onSelectStation) && cell.station !== "TIET_KHUAN";
          const className = [
            "rounded-xl border p-3 text-left shadow-sm transition-all",
            isActive ? "border-emerald-600 bg-emerald-700 text-white" : "border-slate-200 bg-white text-slate-800",
            clickable ? "cursor-pointer hover:border-emerald-400 active:scale-[0.98]" : "cursor-default",
          ].join(" ");

          const body = (
            <>
              <p
                className={`text-[10px] font-bold uppercase tracking-wide ${
                  isActive ? "text-emerald-100" : "text-slate-500"
                }`}
              >
                {STATION_SHORT[cell.station]}
              </p>
              <p className={`mt-1 text-2xl font-black tabular-nums ${isActive ? "text-white" : "text-slate-900"}`}>
                {cell.count}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {cell.redAlertCount > 0 ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      isActive ? "bg-red-500/90 text-white" : "bg-red-100 text-red-700"
                    }`}
                  >
                    Đỏ {cell.redAlertCount}
                  </span>
                ) : null}
                {cell.frozenCount > 0 ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      isActive ? "bg-amber-400/90 text-amber-950" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    Khóa {cell.frozenCount}
                  </span>
                ) : null}
                {cell.station === "TIET_KHUAN" ? (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    Tab mẻ
                  </span>
                ) : null}
              </div>
            </>
          );

          if (clickable && onSelectStation) {
            return (
              <button
                key={cell.station}
                type="button"
                className={className}
                onClick={() => onSelectStation(cell.station)}
              >
                {body}
              </button>
            );
          }
          return (
            <div key={cell.station} className={className}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
