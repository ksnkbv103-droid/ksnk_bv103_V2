// src/modules/giam-sat-vst/views/VSTAnalyticsView.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useVstAnalyticsData } from "../hooks/use-vst-analytics-data";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import { AnalyticsKhoaScopeBanner } from "@/modules/dashboard/components/AnalyticsKhoaScopeBanner";

const VstStrategicAnalyticsPanel = dynamic(() => import("../components/VstStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-50" />,
});

/**
 * View chỉ chứa dashboard thống kê VST.
 */
export default function VSTAnalyticsView() {
  const d = useVstAnalyticsData();

  if (!d.initDone) return <SupervisionPageSkeleton />;

  return (
    <KsnkSupervisionPanel className="min-h-[50vh]">
      {d.khoaFilterLocked && d.lockedKhoaLabel ? <AnalyticsKhoaScopeBanner khoaLabel={d.lockedKhoaLabel} /> : null}
      <VstStrategicAnalyticsPanel
        khoaFilterLocked={d.khoaFilterLocked}
        tuNgay={d.tuNgay}
        setTuNgay={d.setTuNgay}
        denNgay={d.denNgay}
        setDenNgay={d.setDenNgay}
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
        onRefresh={() => void d.loadAnalytics()}
      />
    </KsnkSupervisionPanel>
  );
}
