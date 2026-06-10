// src/modules/giam-sat-vst/views/VSTHistoryView.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import HistoryTable from "../components/HistoryTable";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";

/**
 * View chỉ chứa bảng lịch sử phiên VST.
 * Khi user nhấn "Sửa" → redirect tới form view với editSessionId.
 */
export default function VSTHistoryView() {
  const router = useRouter();

  const handleEditSession = (sessionId: string) => {
    const id = String(sessionId || "").trim();
    if (!id) return;
    router.push(`/giam-sat-vst?edit=${encodeURIComponent(id)}`);
  };

  return (
    <KsnkSupervisionPanel className="min-h-[50vh]">
      <div className="app-data-shell overflow-hidden p-2">
        <HistoryTable onEditSessionId={handleEditSession} />
      </div>
    </KsnkSupervisionPanel>
  );
}
