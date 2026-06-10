// src/modules/giam-sat-chung/views/GscAnalyticsView.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useGscAnalyticsData } from "../hooks/use-gsc-analytics-data";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import GscAnalyticsScopeBanner from "../components/GscAnalyticsScopeBanner";

const GscStrategicAnalyticsPanel = dynamic(() => import("../components/GscStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-[var(--radius-shell)] bg-slate-50" />,
});

interface GscAnalyticsViewProps {
  initialLoaiGiamSat?: GscLoaiGiamSatRoute;
}

/**
 * View chỉ chứa dashboard thống kê GSC.
 */
export default function GscAnalyticsView({ initialLoaiGiamSat }: GscAnalyticsViewProps) {
  const d = useGscAnalyticsData(initialLoaiGiamSat);

  if (!d.initDone) return <SupervisionPageSkeleton />;

  return (
    <KsnkSupervisionPanel className="min-h-[50vh]">
      {initialLoaiGiamSat ? <GscAnalyticsScopeBanner loai={initialLoaiGiamSat} /> : null}
      <GscStrategicAnalyticsPanel
        tuNgay={d.tuNgay}
        setTuNgay={d.setTuNgay}
        denNgay={d.denNgay}
        setDenNgay={d.setDenNgay}
        bangKiemOptions={d.bangKiemOptions}
        selectedBangKiemMas={d.selectedBangKiemMas}
        setSelectedBangKiemMas={d.setSelectedBangKiemMas}
        khoiOptions={d.khoiOptions}
        selectedKhoiIds={d.selectedKhoiIds}
        setSelectedKhoiIds={d.setSelectedKhoiIds}
        khoaOptions={d.khoaOptions}
        selectedKhoaIds={d.selectedKhoaIds}
        setSelectedKhoaIds={d.setSelectedKhoaIds}
        ngheOptions={d.ngheOptions}
        selectedNgheIds={d.selectedNgheIds}
        setSelectedNgheIds={d.setSelectedNgheIds}
        khuVucOptions={d.khuVucOptions}
        selectedKhuVucIds={d.selectedKhuVucIds}
        setSelectedKhuVucIds={d.setSelectedKhuVucIds}
        selectedHinhThucIds={d.selectedHinhThucIds}
        setSelectedHinhThucIds={d.setSelectedHinhThucIds}
        payload={d.payload}
        loading={d.loading}
        loadError={d.loadError}
        checklistClusters={d.checklistClusters}
        clustersLoading={d.clustersLoading}
        truncatedChecklistCount={d.truncatedChecklistCount}
        pendingClusterCount={d.pendingClusterCount}
        clustersRequested={d.clustersRequested}
        onRequestChecklistClusters={d.requestChecklistClusters}
        bkLabelRecord={d.bkLabelRecord}
        onRefresh={() => void d.loadAnalytics()}
      />
    </KsnkSupervisionPanel>
  );
}
