// src/modules/giam-sat-chung/views/GscAnalyticsView.tsx
"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGscAnalyticsData } from "../hooks/use-gsc-analytics-data";
import {
  Bv103AnalyticsPageFrame,
  Bv103AnalyticsPageSkeleton,
} from "@/components/shared/Bv103AnalyticsPageFrame";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";
import { AnalyticsThongKeScopeBanner } from "@/modules/dashboard/components/AnalyticsThongKeScopeBanner";
import GscAnalyticsScopeBanner from "../components/GscAnalyticsScopeBanner";
import { usePermission } from "@/hooks/usePermission";

const LOAI_FROM_SEARCH: Record<string, GscLoaiGiamSatRoute> = {
  TUAN_THU: "TUAN_THU",
  NHAT_KY_VAN_HANH: "NHAT_KY_VAN_HANH",
  DANH_GIA_HE_THONG: "DANH_GIA_HE_THONG",
};

function resolveLoaiFromSearchParams(
  initialLoaiGiamSat: GscLoaiGiamSatRoute | undefined,
  loaiParam: string | null,
): GscLoaiGiamSatRoute | undefined {
  if (initialLoaiGiamSat) return initialLoaiGiamSat;
  if (!loaiParam) return undefined;
  return LOAI_FROM_SEARCH[loaiParam.trim().toUpperCase()];
}

const GscStrategicAnalyticsPanel = dynamic(() => import("../components/GscStrategicAnalyticsPanel"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-[var(--radius-shell)] bg-slate-50" />,
});

const GscBangKiemToiPhaiTgsPanel = dynamic(() => import("../components/GscBangKiemToiPhaiTgsPanel"), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-[var(--radius-shell)] bg-slate-50 mx-2" />,
});

type AnalyticsTab = "thong-ke" | "bk-toi";

interface GscAnalyticsViewProps {
  initialLoaiGiamSat?: GscLoaiGiamSatRoute;
}

function buildTabHref(tab: AnalyticsTab, current: URLSearchParams): string {
  const next = new URLSearchParams(current.toString());
  if (tab === "bk-toi") next.set("view", "bk-toi");
  else next.delete("view");
  const q = next.toString();
  return q ? `?${q}` : "?";
}

/**
 * View dashboard thống kê GSC + tab «BK tôi phải TGS» — cùng khung analytics KSNK.
 */
export default function GscAnalyticsView({ initialLoaiGiamSat }: GscAnalyticsViewProps) {
  const searchParams = useSearchParams();
  const resolvedLoai = resolveLoaiFromSearchParams(
    initialLoaiGiamSat,
    searchParams.get("loai"),
  );
  const d = useGscAnalyticsData(resolvedLoai);
  const pathname = usePathname();
  const router = useRouter();
  const { isGuestStatsOnly } = usePermission(undefined, "view");
  const onThongKeRoute = pathname.startsWith("/thong-ke/gsc");
  const activeTab: AnalyticsTab = searchParams.get("view") === "bk-toi" ? "bk-toi" : "thong-ke";

  const setTab = useCallback(
    (tab: AnalyticsTab) => {
      router.replace(`${pathname}${buildTabHref(tab, searchParams)}`, { scroll: false });
    },
    [router, searchParams, pathname],
  );

  if (!d.initDone) return <Bv103AnalyticsPageSkeleton />;

  const showThongKeFilters = isGuestStatsOnly || activeTab === "thong-ke";
  const filterBar = showThongKeFilters ? (
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
  ) : undefined;

  return (
    <Bv103AnalyticsPageFrame title="Thống kê giám sát chung" filterBar={filterBar}>
      {resolvedLoai && !onThongKeRoute ? (
        <GscAnalyticsScopeBanner loai={resolvedLoai} />
      ) : null}
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

      {activeTab === "bk-toi" && !isGuestStatsOnly ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setTab("thong-ke")}
            className="text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            ← Về thống kê khoa và bảng kiểm yếu
          </button>
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
      ) : (
        <div className="space-y-4">
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
            <p className="px-1 text-xs text-slate-500">
              Việc tự giám sát khoa:{" "}
              <button
                type="button"
                onClick={() => setTab("bk-toi")}
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Bảng kiểm tôi phải tự giám sát
              </button>
            </p>
          ) : null}
        </div>
      )}
    </Bv103AnalyticsPageFrame>
  );
}
