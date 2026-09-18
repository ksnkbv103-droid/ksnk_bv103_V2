// src/modules/giam-sat-chung/views/GscAnalyticsView.tsx
"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useGscAnalyticsData } from "../hooks/use-gsc-analytics-data";
import {
  Bv103AnalyticsPageFrame,
  Bv103AnalyticsPageSkeleton,
} from "@/components/shared/Bv103AnalyticsPageFrame";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import { parseGscLoaiParam, type GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import { AnalyticsThongKeScopeBanner } from "@/modules/dashboard/components/AnalyticsThongKeScopeBanner";
import GscAnalyticsScopeBanner from "../components/GscAnalyticsScopeBanner";
import { usePermission } from "@/hooks/usePermission";

function resolveLoaiFromSearchParams(
  initialLoaiGiamSat: GscLoaiGiamSatRoute | undefined,
  loaiParam: string | null,
): GscLoaiGiamSatRoute | undefined {
  return initialLoaiGiamSat ?? parseGscLoaiParam(loaiParam);
}

const GscStrategicAnalyticsPanel = dynamic(() => import("../components/GscStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-[var(--radius-shell)] bg-slate-50" />,
});

const GscBangKiemToiPhaiTgsPanel = dynamic(() => import("../components/GscBangKiemToiPhaiTgsPanel"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-[var(--radius-shell)] bg-slate-50 mx-2" />,
});

interface GscAnalyticsViewProps {
  initialLoaiGiamSat?: GscLoaiGiamSatRoute;
}

/**
 * P.A (2026-09-17): Tầng 3 — chỉ phân tích khoa.
 * ModeNav (Nhập / Lịch sử / Thống kê) là công tắc duy nhất sang form/history.
 * TGS / BK tôi phải nằm trong «Nâng cao» (thu gọn), không phải tab đồng cấp.
 */
export default function GscAnalyticsView({ initialLoaiGiamSat }: GscAnalyticsViewProps) {
  const searchParams = useSearchParams();
  const resolvedLoai = resolveLoaiFromSearchParams(
    initialLoaiGiamSat,
    searchParams.get("loai"),
  );
  const d = useGscAnalyticsData(resolvedLoai);
  const pathname = usePathname();
  const { isGuestStatsOnly } = usePermission(undefined, "view");
  const onThongKeRoute = pathname.startsWith("/thong-ke/gsc");
  const deepAdvanced =
    searchParams.get("view") === "bk-toi" || searchParams.get("view") === "nang-cao";
  const [advancedOpen, setAdvancedOpen] = useState(deepAdvanced);

  useEffect(() => {
    if (deepAdvanced) setAdvancedOpen(true);
  }, [deepAdvanced]);

  if (!d.initDone) return <Bv103AnalyticsPageSkeleton />;

  const filterBar = (
    <AnalyticsFilterBar
      variant="compact"
      khoaFilterLocked={d.khoaFilterLocked}
      onRefresh={() => void d.loadAnalytics()}
      refreshLoading={d.loading}
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
    <Bv103AnalyticsPageFrame title="Thống kê giám sát chung" filterBar={filterBar}>
      {resolvedLoai ? <GscAnalyticsScopeBanner loai={resolvedLoai} /> : null}
      {onThongKeRoute ? (
        <AnalyticsThongKeScopeBanner
          khoaFilterLocked={d.khoaFilterLocked}
          lockedKhoaLabel={d.lockedKhoaLabel}
        />
      ) : d.khoaFilterLocked && d.lockedKhoaLabel ? (
        <AnalyticsThongKeScopeBanner
          khoaFilterLocked={d.khoaFilterLocked}
          lockedKhoaLabel={d.lockedKhoaLabel}
        />
      ) : null}

      <div className="bv103-stack-page">
        <GscStrategicAnalyticsPanel
          khoaFilterLocked={d.khoaFilterLocked}
          tuNgay={d.tuNgay}
          denNgay={d.denNgay}
          khoiOptions={d.khoiOptions}
          selectedKhoiIds={d.selectedKhoiIds}
          khoaOptions={d.khoaOptions}
          selectedKhoaIds={d.selectedKhoaIds}
          ngheOptions={d.ngheOptions}
          selectedNgheIds={d.selectedNgheIds}
          khuVucOptions={d.khuVucOptions}
          selectedKhuVucIds={d.selectedKhuVucIds}
          selectedHinhThucIds={d.selectedHinhThucIds}
          payload={d.payload}
          loading={d.loading}
          loadError={d.loadError}
          bkLabelRecord={d.bkLabelRecord}
        />
        {!isGuestStatsOnly ? (
          <details
            className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2"
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">
              Nâng cao — đối soát · bao phủ TGS · BK tôi phải
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              Chỉ xem bao phủ và BK phải TGS. Không tạo việc từ đây — vào menu{" "}
              <span className="font-medium">Công việc</span> nếu cần giao việc. Nhập / lịch sử
              phiên dùng ModeNav phía trên (không đổi từ trang thống kê).
            </p>
            {advancedOpen ? (
              <div className="mt-3">
                <GscBangKiemToiPhaiTgsPanel
                  tuNgay={d.tuNgay}
                  setTuNgay={d.setTuNgay}
                  denNgay={d.denNgay}
                  setDenNgay={d.setDenNgay}
                  khoaOptions={d.khoaOptions}
                  selectedKhoaIds={d.selectedKhoaIds}
                  khoaFilterLocked={d.khoaFilterLocked}
                  lockedKhoaLabel={d.lockedKhoaLabel}
                />
              </div>
            ) : null}
          </details>
        ) : null}
      </div>
    </Bv103AnalyticsPageFrame>
  );
}
