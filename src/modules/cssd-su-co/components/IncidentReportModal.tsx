// src/modules/cssd-su-co/components/IncidentReportModal.tsx
"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import SuCoReportForm from "./SuCoReportForm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  station?: string;
  onSuccess?: () => void;
  defaultGroup?: "PROCESS" | "INSTRUMENT" | "CHEMICAL" | "EQUIPMENT" | "OTHER";
  initialMaQR?: string;
  initialChiTietId?: string;
  initialLoaiDungCuId?: string;
  initialTypeId?: string;
  quyTrinhId?: string | null;
  initialMaLo?: string;
  initialLoTietKhuanId?: string;
}

export default function IncidentReportModal({
  isOpen,
  onClose,
  station,
  onSuccess,
  defaultGroup,
  initialMaQR,
  initialChiTietId,
  initialLoaiDungCuId,
  initialTypeId,
  quyTrinhId,
  initialMaLo,
  initialLoTietKhuanId,
}: Props) {
  const { allowed } = useModulePermission("BAO_SU_CO");

  useBodyScrollLock(isOpen);

  if (!isOpen || !allowed.create) return null;

  const st = (station || "TIEP_NHAN") as Station;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex animate-in flex-col justify-end bg-slate-900/70 backdrop-blur-sm fade-in duration-200 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Báo cáo sự cố"
    >
      <div className="flex max-h-[100dvh] w-full touch-manipulation flex-col overflow-hidden rounded-t-[1.25rem] border-t-4 border-red-500/30 bg-white shadow-2xl sm:max-h-[min(92dvh,920px)] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-slate-200">
        <div className="flex shrink-0 items-center justify-between gap-3 bg-[var(--primary)] px-4 py-4 text-[#FFD700] shadow-md sm:px-5">
          <div className="min-w-0">
            <div className={`flex items-center gap-2 ${UI.panelSubtitle} uppercase tracking-wide text-[#FFD700] sm:text-[11px] sm:tracking-[0.2em]`}>
              <AlertTriangle className="shrink-0 animate-pulse" size={20} aria-hidden />
              <span>Báo cáo sự cố</span>
            </div>
            <p className={`mt-0.5 truncate ${UI.modalSubtitle} text-[#FFD700]/80`}>
              Điền đủ thông tin — vuốt xuống nếu form dài
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 transition-all active:scale-90"
            aria-label="Đóng"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <SuCoReportForm
              layout="modal"
              initialStation={st}
              initialGroup={defaultGroup || (initialMaQR ? "INSTRUMENT" : undefined)}
              initialMaQR={initialMaQR}
              initialChiTietId={initialChiTietId}
              initialLoaiDungCuId={initialLoaiDungCuId}
              initialTypeId={initialTypeId}
              quyTrinhId={quyTrinhId}
              initialMaLo={initialMaLo}
              initialLoTietKhuanId={initialLoTietKhuanId}
              enabled={isOpen}
              onSubmitted={() => {
                onSuccess?.();
                onClose();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
