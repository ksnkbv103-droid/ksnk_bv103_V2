// src/modules/giam-sat-chung/views/GscAnalyticsView.tsx
"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useGscAnalyticsData } from "../hooks/use-gsc-analytics-data";
import { KsnkSupervisionPanel } from "@/components/shared/ksnk-supervision-chrome";
import SupervisionPageSkeleton from "@/components/shared/SupervisionPageSkeleton";
import type { GscLoaiGiamSatRoute } from "../lib/gsc-app-paths";

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
import { AnalyticsKhoaScopeBanner } from "@/modules/dashboard/components/AnalyticsKhoaScopeBanner";
import GscAnalyticsScopeBanner from "../components/GscAnalyticsScopeBanner";

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
 * View dashboard thống kê GSC + tab «BK tôi phải TGS» (nghĩa vụ khoa).
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
  const activeTab: AnalyticsTab = searchParams.get("view") === "bk-toi" ? "bk-toi" : "thong-ke";

  const setTab = useCallback(
    (tab: AnalyticsTab) => {
      router.replace(`${pathname}${buildTabHref(tab, searchParams)}`, { scroll: false });
    },
    [router, searchParams, pathname],
  );

  if (!d.initDone) return <SupervisionPageSkeleton />;

  return (
    <KsnkSupervisionPanel className="min-h-[50vh]">
      {resolvedLoai && !pathname.startsWith("/thong-ke/gsc") ? (
        <GscAnalyticsScopeBanner loai={resolvedLoai} />
      ) : null}
      {d.khoaFilterLocked && d.lockedKhoaLabel ? <AnalyticsKhoaScopeBanner khoaLabel={d.lockedKhoaLabel} /> : null}

      <div className="px-2 pb-2">
        <div className="inline-flex gap-1 rounded-[var(--radius-shell)] bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTab("thong-ke")}
            className={`rounded-[var(--radius-shell)] px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "thong-ke"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Thống kê theo bảng kiểm
          </button>
          <button
            type="button"
            onClick={() => setTab("bk-toi")}
            className={`rounded-[var(--radius-shell)] px-4 py-2 text-xs font-bold transition-colors ${
              activeTab === "bk-toi"
                ? "bg-white text-[var(--primary)] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            BK tôi phải TGS
          </button>
        </div>
      </div>

      {activeTab === "bk-toi" ? (
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
    </KsnkSupervisionPanel>
  );
}
