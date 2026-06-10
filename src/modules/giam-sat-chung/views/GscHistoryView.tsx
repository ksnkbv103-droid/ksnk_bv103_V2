// src/modules/giam-sat-chung/views/GscHistoryView.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import HistoryTable from "../components/HistoryTable";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";

/** Resolve base path cho navigation dựa trên loaiGiamSat. */
function resolveBasePath(loai?: GscLoaiGiamSatRoute): string {
  if (!loai) return "/giam-sat-chung";
  switch (loai) {
    case "TUAN_THU": return "/giam-sat-chung/tuan-thu";
    case "NHAT_KY_VAN_HANH": return "/giam-sat-chung/nhat-ky";
    case "DANH_GIA_HE_THONG": return "/giam-sat-chung/he-thong";
    default: return "/giam-sat-chung";
  }
}

interface GscHistoryViewProps {
  loaiGiamSat?: GscLoaiGiamSatRoute;
}

/**
 * View chỉ chứa bảng lịch sử phiên giám sát chung.
 * Khi user nhấn "Sửa" → redirect tới form view.
 */
export default function GscHistoryView({ loaiGiamSat }: GscHistoryViewProps) {
  const router = useRouter();
  const basePath = resolveBasePath(loaiGiamSat);

  return (
    <KsnkSupervisionPanel className="min-h-[50vh]">
      <div className="app-data-shell overflow-hidden p-2">
        <HistoryTable
          loaiGiamSat={loaiGiamSat}
          onEditBundle={(bundle, row) => {
            // Encode edit context into URL params and redirect to form
            const sessionId = String(row.id || "").trim();
            if (sessionId) {
              router.push(`${basePath}?edit=${encodeURIComponent(sessionId)}`);
            }
          }}
        />
      </div>
    </KsnkSupervisionPanel>
  );
}
