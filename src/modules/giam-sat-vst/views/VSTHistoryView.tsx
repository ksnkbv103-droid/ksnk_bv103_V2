// src/modules/giam-sat-vst/views/VSTHistoryView.tsx
"use client";

import React from "react";
import HistoryTable from "../components/HistoryTable";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import { VstModuleAccessGate } from "../components/VstModuleAccessGate";
import { SupervisionExcelExportButton } from "@/components/shared/SupervisionExcelExportButton";
import { exportVstOpportunitiesRaw } from "../actions/vst-export.actions";

/**
 * View chỉ chứa bảng lịch sử phiên VST.
 */
export default function VSTHistoryView() {
  return (
    <VstModuleAccessGate>
      <KsnkSupervisionPanel className="min-h-[50vh]">
        <div className="app-data-shell space-y-2 p-2">
          <div className="flex justify-end print:hidden">
            <SupervisionExcelExportButton
              label="Xuất Excel (90 ngày)"
              fileBase="VST_co_hoi"
              sheetName="VST"
              loadRows={async (range) => {
                const res = await exportVstOpportunitiesRaw(range);
                if (!res.success) return res;
                return { success: true, rows: res.rows as unknown as Record<string, unknown>[] };
              }}
            />
          </div>
          <HistoryTable />
        </div>
      </KsnkSupervisionPanel>
    </VstModuleAccessGate>
  );
}
