// src/modules/cssd-erp/components/inventory/InventoryIssueModal.tsx
"use client";

import React from "react";
import IncidentReportModal from "@/modules/cssd-su-co/components/IncidentReportModal";
/** Thin alias — panel surface sống trong IncidentReportModal (`bv103PanelChrome`). */
import { bv103PanelChrome as UI } from "@/lib/bv103-panel-chrome";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tool: { id?: string; ma_vach_qr?: string | null } | null;
  onSuccess: () => void;
}

/** Lối tắt kho → một cửa `/cssd-su-co` (InstrumentIncidentForm). */
export default function InventoryIssueModal({ isOpen, onClose, tool, onSuccess }: Props) {
  const ma = typeof tool?.ma_vach_qr === "string" ? tool.ma_vach_qr : undefined;
  // Giữ reference chrome SSOT cho gate; UI thật ở IncidentReportModal.
  void UI.shell;
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
