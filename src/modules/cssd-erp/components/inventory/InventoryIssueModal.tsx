// src/modules/cssd-erp/components/inventory/InventoryIssueModal.tsx
"use client";

import React from "react";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tool: { id?: string; ma_vach_qr?: string | null } | null;
  onSuccess: () => void;
}

/** Lối tắt kho → một cửa `/cssd-su-co` (InstrumentIncident form). */
export default function InventoryIssueModal({ isOpen, onClose, tool, onSuccess }: Props) {
  const ma = typeof tool?.ma_vach_qr === "string" ? tool.ma_vach_qr : undefined;
  return (
    <IncidentReportModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      defaultGroup="INSTRUMENT"
      initialTypeId="INSTRUMENT_BROKEN"
      initialMaQR={ma}
      quyTrinhId={tool?.id || null}
      station="CAP_PHAT"
    />
  );
}
