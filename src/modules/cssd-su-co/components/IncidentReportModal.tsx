// src/modules/cssd-su-co/components/IncidentReportModal.tsx
"use client";

import { CSSD_UI_PANEL_CHROME as UI } from "@/modules/cssd-erp/shared/ui/cssd-ui-chrome";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import SuCoReportForm from "./SuCoReportForm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  station?: string;
  onSuccess?: () => void;
  defaultGroup?: "PROCESS" | "INSTRUMENT" | "CHEMICAL" | "EQUIPMENT" | "OTHER";
}

export default function IncidentReportModal({ isOpen, onClose, station, onSuccess, defaultGroup }: Props) {
  const { allowed } = useModulePermission("BAO_SU_CO");
  if (!isOpen || !allowed.create) return null;

  const st = (station || "TIEP_NHAN") as Station;

  return (
    <div className={`${UI.sectionGap} pointer-events-auto fixed inset-0 z-[100] flex animate-in justify-center bg-slate-900/60 p-0 backdrop-blur-sm fade-in duration-200 sm:items-center sm:p-4`}>
      <div className="flex max-h-[95vh] w-full max-w-lg touch-manipulation flex-col overflow-hidden rounded-t-2xl border-t-4 border-red-500/10 bg-white shadow-2xl sm:rounded-2xl sm:border-4">
        <div className="flex shrink-0 items-center justify-between bg-[var(--primary)] p-5 text-[#FFD700] shadow-md">
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide tracking-[0.2em]">
            <AlertTriangle className="animate-pulse" size={20} /> Báo cáo sự cố
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 transition-all active:scale-90"
            aria-label="Đóng"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 pb-10">
          <SuCoReportForm
            initialStation={st}
            initialGroup={defaultGroup}
            enabled={isOpen}
            onSubmitted={() => {
              onSuccess?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
