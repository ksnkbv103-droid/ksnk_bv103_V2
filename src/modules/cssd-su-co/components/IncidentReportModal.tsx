// src/modules/cssd-su-co/components/IncidentReportModal.tsx
"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
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
      className="pointer-events-auto fixed inset-0 z-[100] flex animate-in flex-col justify-end bg-slate-900/50 fade-in duration-200 sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Báo cáo sự cố"
    >
      <div className="flex max-h-[100dvh] w-full touch-manipulation flex-col overflow-hidden rounded-t-[var(--radius-shell)] bg-white shadow-[var(--shadow-app-soft)] sm:max-h-[min(94dvh,960px)] sm:max-w-6xl sm:rounded-[var(--radius-shell)] sm:border sm:border-slate-200">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className={`flex items-center gap-2 ${UI.panelTitle}`}>
              <AlertTriangle className="shrink-0 text-amber-600" size={18} aria-hidden />
              <span>Báo cáo sự cố</span>
            </div>
            <p className={`mt-0.5 truncate ${UI.panelSubtitle}`}>
              {defaultGroup === "INSTRUMENT"
                ? "Đổi mã · tên · số lượng (chờ duyệt) · Hỏng/Mất · tab Chuyển cho kho↔bộ / bộ↔bộ"
                : "Ghi nhận sự việc tại trạm"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
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
              onDismiss={onClose}
              onSubmitted={() => {
                onSuccess?.();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
