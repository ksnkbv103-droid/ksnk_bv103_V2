"use client";

import React from "react";
import { Box, Clock, Microscope, Truck, WashingMachine } from "lucide-react";
import type { Station } from "../../types/cssd.types";
import { SCAN_STATIONS } from "../../workflow/domain/cssd-stations";
import { CSSD_UI_PANEL } from "../../shared/ui/cssd-ui-chrome";
import CssdBatchMeLinkChip from "./cssd-batch-me-link-chip";

const STATION_LABEL: Record<Station, string> = {
  TIEP_NHAN: "Tiếp nhận",
  LAM_SACH: "Làm sạch",
  QC: "Kiểm bộ",
  DONG_GOI: "Đóng gói",
  TIET_KHUAN: "Tiệt khuẩn",
  CAP_PHAT: "Cấp phát",
};

const STATION_ICON: Record<Exclude<Station, "TIET_KHUAN">, React.ReactNode> = {
  TIEP_NHAN: <Clock size={14} aria-hidden />,
  LAM_SACH: <WashingMachine size={14} aria-hidden />,
  QC: <Microscope size={14} aria-hidden />,
  DONG_GOI: <Box size={14} aria-hidden />,
  CAP_PHAT: <Truck size={14} aria-hidden />,
};

/** 4 trạm quét → phiếu mẻ → cấp phát (không chọn TK bằng quét). */
const SCAN_BEFORE_CAP = SCAN_STATIONS.slice(0, 4) as Station[];
const CAP_STATION = SCAN_STATIONS[4] as Station;

/** Calm ambient cell — clear current; no poster fill / shadow / lecture titles. */
const CELL_BASE =
  "group relative flex min-h-[2.75rem] w-full flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] border px-1.5 py-1.5 text-center transition-colors touch-manipulation sm:min-h-12 sm:px-2";

type Props = {
  activeStation?: Station | null;
  onSelectStation: (station: Station) => void;
  /** Đang mở thẻ đóng gói — không đổi trạm. */
  gateLocked?: boolean;
};

/** Chọn trạm để xem hàng chờ — quét không bắt buộc chọn trước. */
export default function CssdStationFlowMap({ activeStation, onSelectStation, gateLocked }: Props) {
  const renderScanStation = (station: Station) => {
    const isActive = activeStation === station;
    const locked = Boolean(gateLocked) && !isActive;
    return (
      <button
        key={station}
        type="button"
        onClick={() => onSelectStation(station)}
        aria-pressed={isActive}
        aria-disabled={locked}
        aria-label={`Xem hàng chờ ${STATION_LABEL[station]}`}
        title={STATION_LABEL[station]}
        className={`${CELL_BASE} ${
          isActive
            ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/25"
            : locked
              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200/90 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <span className={`shrink-0 ${isActive ? "text-[var(--primary)]" : "text-slate-400"}`}>
          {STATION_ICON[station as Exclude<Station, "TIET_KHUAN">]}
        </span>
        <span
          className={`truncate bv103-type-label font-semibold leading-tight ${
            isActive ? "text-[var(--primary)]" : "text-slate-700"
          }`}
        >
          {STATION_LABEL[station]}
        </span>
      </button>
    );
  };

  return (
    <section
      className={`space-y-1.5 p-2 sm:p-2.5 ${CSSD_UI_PANEL}`}
      aria-label="Trạm chu trình"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <p className="bv103-type-label text-slate-500">Trạm</p>
        {activeStation ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {STATION_LABEL[activeStation]}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-6">
        {SCAN_BEFORE_CAP.map((station) => renderScanStation(station))}
        <CssdBatchMeLinkChip />
        {renderScanStation(CAP_STATION)}
      </div>
    </section>
  );
}
