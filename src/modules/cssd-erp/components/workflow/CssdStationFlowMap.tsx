"use client";

import React from "react";
import { Box, Clock, Microscope, Truck, WashingMachine } from "lucide-react";
import type { Station } from "../../types/cssd.types";
import { SCAN_STATIONS } from "../../workflow/domain/cssd-stations";
import { CSSD_UI_PANEL, CSSD_UI_SECTION_TITLE } from "../../shared/ui/cssd-ui-chrome";
import CssdBatchMeLinkChip from "./cssd-batch-me-link-chip";

const STATION_LABEL: Record<Station, string> = {
  TIEP_NHAN: "Tiếp nhận",
  LAM_SACH: "Làm sạch",
  QC: "Kiểm bộ",
  DONG_GOI: "Đóng gói",
  TIET_KHUAN: "Tiệt khuẩn",
  CAP_PHAT: "Cấp phát",
};

/** Helper QT.19 — tách QC trạm vs QC mẻ (domain). */
const STATION_HINT: Partial<Record<Station, string>> = {
  QC: "QC trước đóng gói (QT.19) ≠ QC mẻ",
};

const STATION_ICON: Record<Exclude<Station, "TIET_KHUAN">, React.ReactNode> = {
  TIEP_NHAN: <Clock size={16} aria-hidden />,
  LAM_SACH: <WashingMachine size={16} aria-hidden />,
  QC: <Microscope size={16} aria-hidden />,
  DONG_GOI: <Box size={16} aria-hidden />,
  CAP_PHAT: <Truck size={16} aria-hidden />,
};

/** 4 trạm quét → phiếu mẻ → cấp phát (không chọn TK bằng quét). */
const SCAN_BEFORE_CAP = SCAN_STATIONS.slice(0, 4) as Station[];
const CAP_STATION = SCAN_STATIONS[4] as Station;

const CELL_BASE =
  "group relative flex h-14 w-full flex-col items-center justify-center gap-1 rounded-xl border px-2 py-1.5 text-center transition-all touch-manipulation sm:h-16 sm:px-2.5";

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
        title={STATION_HINT[station] || STATION_LABEL[station]}
        className={`${CELL_BASE} ${
          isActive
            ? "border-emerald-600 bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30"
            : locked
              ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
              : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/40"
        }`}
      >
        <span className={`shrink-0 ${isActive ? "text-amber-300" : "text-slate-400 group-hover:text-emerald-600"}`}>
          {STATION_ICON[station as Exclude<Station, "TIET_KHUAN">]}
        </span>
        <span
          className={`truncate bv103-type-label font-semibold leading-tight ${isActive ? "text-white" : "text-slate-700"}`}
        >
          {STATION_LABEL[station]}
        </span>
      </button>
    );
  };

  return (
    <section className={`space-y-2 p-2.5 sm:p-3 ${CSSD_UI_PANEL}`} aria-label="Xem hàng chờ theo trạm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <h2 className={`${CSSD_UI_SECTION_TITLE} max-sm:text-sm`}>Xem hàng chờ</h2>
        {activeStation ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
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
