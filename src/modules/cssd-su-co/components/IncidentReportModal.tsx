// src/modules/cssd-su-co/components/IncidentReportModal.tsx
"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useModulePermission } from "@/hooks/useModulePermission";
import type { Station } from "@/modules/cssd-erp/types/cssd.types";
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import SuCoReportForm from "./SuCoReportForm";
import { INCIDENT_GROUP_LABEL } from "../domain/cssd-incident-taxonomy";

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
  batchRecallEntry?: boolean;
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
  batchRecallEntry = false,
}: Props) {
  const { allowed } = useModulePermission("BAO_SU_CO");

  if (!isOpen || !allowed.create) return null;

  const st = (station || "TIEP_NHAN") as Station;
  const resolvedGroup = defaultGroup || (initialMaQR ? "INSTRUMENT" : undefined);
  const title = batchRecallEntry
    ? "Thu hồi theo mẻ"
    : resolvedGroup
      ? INCIDENT_GROUP_LABEL[resolvedGroup]
      : "Báo cáo sự cố";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[min(94dvh,960px)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
        aria-label="Báo cáo sự cố"
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 pr-14 sm:px-5">
          <div className="min-w-0">
            <div className={`flex items-center gap-2 ${UI.panelTitle}`}>
              <AlertTriangle className="shrink-0 text-amber-600" size={18} aria-hidden />
              <span>{title}</span>
            </div>
            <p className={`mt-0.5 truncate ${UI.panelSubtitle}`}>
              {batchRecallEntry
                ? "Sự cố quy trình — thu hồi theo mẻ (không phải Hỏng/Mất)"
                : resolvedGroup === "INSTRUMENT"
                  ? "Chỉ Hỏng/Mất. Luân chuyển số lượng mở tại Dụng cụ."
                  : "Ghi nhận tại trạm (quy trình / hóa chất / máy / khác)"}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <SuCoReportForm
            layout="modal"
            initialStation={st}
            initialGroup={resolvedGroup}
            initialMaQR={initialMaQR}
            initialChiTietId={initialChiTietId}
            initialLoaiDungCuId={initialLoaiDungCuId}
            initialTypeId={initialTypeId}
            quyTrinhId={quyTrinhId}
            initialMaLo={initialMaLo}
            initialLoTietKhuanId={initialLoTietKhuanId}
            batchRecallEntry={batchRecallEntry}
            enabled={isOpen}
            onDismiss={onClose}
            onSubmitted={() => {
              onSuccess?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
