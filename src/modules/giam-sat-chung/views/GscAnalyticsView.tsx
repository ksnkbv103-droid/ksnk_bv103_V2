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

  return (
    <Bv103AnalyticsPageFrame
      title="Thống kê giám sát chung"
      description="Phân tích theo bảng kiểm, vi phạm và nghĩa vụ TGS — cùng khung báo cáo KSNK."
    >
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

      {!isGuestStatsOnly ? (
        <div className="px-1 pb-1 sm:px-2 sm:pb-2">
          <div className="inline-flex w-full gap-1 rounded-[var(--radius-shell)] bg-slate-100 p-0.5 sm:w-auto sm:p-1">
            <button
              type="button"
              onClick={() => setTab("thong-ke")}
              className={`min-h-9 flex-1 rounded-[var(--radius-shell)] px-2 py-1.5 text-xs font-bold transition-colors touch-manipulation sm:flex-initial sm:px-4 sm:py-2 ${
                activeTab === "thong-ke"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="sm:hidden">Thống kê</span>
              <span className="hidden sm:inline">Thống kê theo bảng kiểm</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("bk-toi")}
              className={`min-h-9 flex-1 rounded-[var(--radius-shell)] px-2 py-1.5 text-xs font-bold transition-colors touch-manipulation sm:flex-initial sm:px-4 sm:py-2 ${
                activeTab === "bk-toi"
                  ? "bg-white text-[var(--primary)] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="sm:hidden">BK TGS</span>
              <span className="hidden sm:inline">BK tôi phải TGS</span>
            </button>
          </div>
        </div>
      ) : null}

      {!isGuestStatsOnly && activeTab === "bk-toi" ? (
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
      ) : (
        <GscStrategicAnalyticsPanel
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
          payload={d.payload}
          loading={d.loading}
          loadError={d.loadError}
          bkLabelRecord={d.bkLabelRecord}
          onRefresh={() => void d.loadAnalytics()}
        />
      )}
    </Bv103AnalyticsPageFrame>
  );
}
