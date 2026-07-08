// src/modules/giam-sat-vst/views/VSTHistoryView.tsx
"use client";

import React from "react";
import HistoryTable from "../components/HistoryTable";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import { VstModuleAccessGate } from "../components/VstModuleAccessGate";

/**
 * View chỉ chứa bảng lịch sử phiên VST.
 */
export default function VSTHistoryView() {
  return (
    <VstModuleAccessGate>
      <KsnkSupervisionPanel className="min-h-[50vh]">
        <div className="app-data-shell p-2">
          <HistoryTable />
        </div>
      </KsnkSupervisionPanel>
    </VstModuleAccessGate>
  );
}
