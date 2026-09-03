// src/modules/giam-sat-chung/views/GscHistoryView.tsx
"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HistoryTable from "../components/HistoryTable";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import { parseGscLoaiParam, type GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import { SupervisionExcelExportButton } from "@/components/shared/SupervisionExcelExportButton";
import { exportGscSessionsRaw } from "../actions/gsc-export.actions";

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
  const searchParams = useSearchParams();
  const resolvedLoai = loaiGiamSat ?? parseGscLoaiParam(searchParams.get("loai"));
  const basePath = resolveBasePath(resolvedLoai);

  return (
    <KsnkSupervisionPanel className="min-h-[50vh]">
      <div className="space-y-2">
        <div className="flex justify-end print:hidden">
          <SupervisionExcelExportButton
            label="Xuất Excel (90 ngày)"
            fileBase="GSC_phien"
            sheetName="GSC"
            loadRows={async (range) => {
              const res = await exportGscSessionsRaw(range);
              if (!res.success) return res;
              return { success: true, rows: res.rows as unknown as Record<string, unknown>[] };
            }}
          />
        </div>
        <HistoryTable
          loaiGiamSat={resolvedLoai}
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
