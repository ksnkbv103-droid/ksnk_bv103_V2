"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { Bv103AnalyticsPageFrame, Bv103AnalyticsPageSkeleton } from "@/components/shared/Bv103AnalyticsPageFrame";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { useCommandCenterBriefData } from "@/modules/dashboard/hooks/useCommandCenterBriefData";
import {
  CommandCenterBriefSections,
  CommandCenterKsnkStaffSection,
} from "@/modules/dashboard/components/command-center/CommandCenterBriefSections";
import { CommandCenterQuickActions } from "@/modules/dashboard/components/command-center/CommandCenterQuickActions";
import { CommandCenterQlcvSection } from "@/modules/dashboard/components/command-center/CommandCenterQlcvSection";
import { AnalyticsKhoaScopeBanner } from "@/modules/dashboard/components/AnalyticsKhoaScopeBanner";

export function CommandCenterDashboardPage() {
  const d = useCommandCenterBriefData();

  if (d.loading && !d.initDone) {
    return <Bv103AnalyticsPageSkeleton />;
  }

  const filterBar = (
    <AnalyticsFilterBar
      khoaFilterLocked={d.khoaFilterLocked}
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
    />
  );

  return (
    <Bv103AnalyticsPageFrame
      eyebrow="Dashboard · KSNK BV103"
      title="Trung tâm điều hành"
      description="Vận hành hằng ngày — không thay báo cáo kỳ chính thức."
      actions={
        <button type="button" onClick={() => void d.loadDashboard()} className={bv103DesignTokens.btnGhostDark}>
          <RefreshCw size={14} aria-hidden /> Cập nhật
        </button>
      }
      filterBar={filterBar}
    >
      {d.loadError ? (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span className="flex items-center gap-2 font-medium">
            <AlertTriangle size={18} aria-hidden /> {d.loadError}
          </span>
          <button type="button" className={bv103DesignTokens.btnPrimary} onClick={() => void d.loadDashboard()}>
            Thử lại
          </button>
        </div>
      ) : null}

      <div className={`space-y-8 transition-opacity ${d.loading ? "pointer-events-none opacity-50" : ""}`}>
        {d.khoaFilterLocked && d.lockedKhoaLabel ? <AnalyticsKhoaScopeBanner khoaLabel={d.lockedKhoaLabel} /> : null}
        <CommandCenterQuickActions
          tuNgay={d.tuNgay}
          denNgay={d.denNgay}
          selectedKhoaIds={d.selectedKhoaIds}
        />
        <CommandCenterBriefSections
          vstPayload={d.vstPayload}
          gscPayload={d.gscPayload}
          tuNgay={d.tuNgay}
          denNgay={d.denNgay}
          selectedKhoaIds={d.selectedKhoaIds}
          loading={d.loading}
        />

        {d.qlcvBriefAvailable && d.qlcvBrief ? (
          <CommandCenterQlcvSection brief={d.qlcvBrief} loading={d.loading} />
        ) : null}

        {d.showKsnkStaff || !d.staffLoaded ? (
          <CommandCenterKsnkStaffSection
            rows={d.ksnkStaffStats}
            loading={d.staffLoading}
            onExpand={() => void d.loadKsnkStaff()}
          />
        ) : null}
      </div>
    </Bv103AnalyticsPageFrame>
  );
}
