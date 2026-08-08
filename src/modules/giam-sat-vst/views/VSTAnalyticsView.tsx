// src/modules/giam-sat-vst/views/VSTAnalyticsView.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useVstAnalyticsData } from "../hooks/use-vst-analytics-data";
import {
  Bv103AnalyticsPageFrame,
  Bv103AnalyticsPageSkeleton,
} from "@/components/shared/Bv103AnalyticsPageFrame";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { AnalyticsThongKeScopeBanner } from "@/modules/dashboard/components/AnalyticsThongKeScopeBanner";

const VstStrategicAnalyticsPanel = dynamic(() => import("../components/VstStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-[var(--radius-shell)] bg-slate-50" />,
});

/**
 * View chỉ chứa dashboard thống kê VST — cùng khung analytics với Command Center / BCTH.
 * Trên `/thong-ke/*` filter vào sticky chrome layout (ThongKeChromeSlot).
 */
export default function VSTAnalyticsView() {
  const d = useVstAnalyticsData();

  if (!d.initDone) return <Bv103AnalyticsPageSkeleton />;

  if (d.filterInitError) {
    return (
      <Bv103AnalyticsPageFrame title="Thống kê vệ sinh tay">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {d.filterInitError}
        </div>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-[var(--primary)] underline"
          onClick={() => window.location.reload()}
        >
          Thử lại
        </button>
      </Bv103AnalyticsPageFrame>
    );
  }

  const filterBar = (
    <AnalyticsFilterBar
      variant="compact"
      hideBangKiem
      khoaFilterLocked={d.khoaFilterLocked}
      onRefresh={() => void d.loadAnalytics()}
      refreshLoading={d.loading}
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
    />
  );

  return (
    <Bv103AnalyticsPageFrame title="Thống kê vệ sinh tay" filterBar={filterBar}>
      <AnalyticsThongKeScopeBanner
        khoaFilterLocked={d.khoaFilterLocked}
        lockedKhoaLabel={d.lockedKhoaLabel}
      />
      <VstStrategicAnalyticsPanel
        khoaFilterLocked={d.khoaFilterLocked}
        tuNgay={d.tuNgay}
        denNgay={d.denNgay}
        khoaOptions={d.khoaOptions}
        selectedKhoaIds={d.selectedKhoaIds}
        payload={d.payload}
        loading={d.loading}
        loadError={d.loadError}
      />
    </Bv103AnalyticsPageFrame>
  );
}
