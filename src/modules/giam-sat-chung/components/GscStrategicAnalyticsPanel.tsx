"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SupervisionCoverageCard } from "@/lib/analytics/SupervisionCoverageCard";
import { buildCoverageSummary } from "@/lib/analytics/supervision-coverage";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2FromRatio } from "@/lib/analytics/supervision-percent";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import type { GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";
import { GscChecklistNavigator } from "./GscChecklistNavigator";
import { GscBkAnalyticsDashboard } from "./GscBkAnalyticsDashboard";
import GscTgsCoverageRankingPanel from "./GscTgsCoverageRankingPanel";
import { useGscChecklistDetail } from "../hooks/use-gsc-checklist-detail";
import { SupervisionAttentionBlock } from "@/lib/analytics/SupervisionAttentionBlock";
import { SupervisionKeHoachCard } from "@/lib/analytics/SupervisionKeHoachCard";
import { buildSupervisionAlerts } from "@/lib/analytics/supervision-alerts";
import { buildActionBoardModel } from "@/lib/analytics/supervision-action-board";
import { SupervisionSourceTabs } from "@/lib/analytics/SupervisionSourceTabs";
import { defaultSourceView, type SupervisionSourceView } from "@/lib/analytics/supervision-source-tabs";
import { SupervisionDoiSoatPanel } from "@/lib/analytics/SupervisionDoiSoatPanel";
import {
  gapRowsWithLensData,
  maskGapRowsForLens,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";

type Props = {
  tuNgay: string;
  denNgay: string;
  khoiOptions: { id: string; label: string }[];
  selectedKhoiIds: string[];
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  ngheOptions: { id: string; label: string }[];
  selectedNgheIds: string[];
  khuVucOptions: { id: string; label: string }[];
  selectedKhuVucIds: string[];
  selectedHinhThucIds: string[];
  payload: GscStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  bkLabelRecord?: Record<string, string>;
  khoaFilterLocked?: boolean;
  /** GS-02: lens điều khiển fetch RPC; đổi lens → refetch. */
  sourceLens: SupervisionSourceLens;
  onSourceLensChange: (lens: SupervisionSourceLens) => void;
};

/**
 * Thống kê GSC, 4 tầng: tổng quan (KPI · độ phủ) · bảng kiểm · theo khoa · xu hướng và so sánh.
 * Bộ lọc nằm ở `Bv103AnalyticsPageFrame.filterBar` (sticky, luôn hiện).
 */
export default function GscStrategicAnalyticsPanel(p: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [selectedMaBk, setSelectedMaBk] = useState<string | null>(() => searchParams.get("bk"));
  const sourceLens = p.sourceLens;
  const [view, setView] = useState<SupervisionSourceView>(() => defaultSourceView(p.khoaFilterLocked));
  const { onSourceLensChange } = p;
  useEffect(() => {
    const first = defaultSourceView(p.khoaFilterLocked);
    if (first !== "ksnk") onSourceLensChange(first);
    // chỉ áp tab mặc định theo vai trò một lần
  }, []);
  const changeView = (v: SupervisionSourceView) => {
    setView(v);
    if (v !== "sosanh") onSourceLensChange(v);
  };

  useEffect(() => {
    const fromUrl = searchParams.get("bk");
    if (fromUrl) setSelectedMaBk(fromUrl);
  }, [searchParams]);

  const syncBkToUrl = useCallback(
    (ma: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (ma) next.set("bk", ma);
      else next.delete("bk");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const onSelectMaBk = useCallback(
    (ma: string | null) => {
      setSelectedMaBk(ma);
      syncBkToUrl(ma);
    },
    [syncBkToUrl],
  );

  const selectedLabel = useMemo(() => {
    if (!selectedMaBk) return "";
    return p.bkLabelRecord?.[selectedMaBk] ?? selectedMaBk;
  }, [selectedMaBk, p.bkLabelRecord]);

  const { detail, loading: detailLoading, error: detailError } = useGscChecklistDetail({
    maBk: selectedMaBk,
    tuNgay: p.tuNgay,
    denNgay: p.denNgay,
    selectedKhoiIds: p.selectedKhoiIds,
    selectedKhoaIds: p.selectedKhoaIds,
    selectedNgheIds: p.selectedNgheIds,
    selectedKhuVucIds: p.selectedKhuVucIds,
    selectedHinhThucIds: p.selectedHinhThucIds,
    khoiOptionCount: p.khoiOptions.length,
    khoaOptionCount: p.khoaOptions.length,
    ngheOptionCount: p.ngheOptions.length,
    khuOptionCount: p.khuVucOptions.length,
  });

  const gapKhoaRows = useMemo(
    () => buildGapKhoaRows(p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions, p.khoaOptions.length),
    [p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions],
  );
  const khoaScope = useMemo(
    () => (p.selectedKhoaIds.length ? p.khoaOptions.filter((k) => p.selectedKhoaIds.includes(k.id)) : p.khoaOptions),
    [p.khoaOptions, p.selectedKhoaIds],
  );
  const alerts = useMemo(
    () => buildSupervisionAlerts({ source: "gsc", matrixKhoa: p.payload?.matrix_khoa, khoaScope }),
    [p.payload?.matrix_khoa, khoaScope],
  );
  const board = useMemo(
    () => buildActionBoardModel({ source: "gsc", matrixKhoa: p.payload?.matrix_khoa, topViolations: p.payload?.top_violations }),
    [p.payload],
  );

  const coverage = useMemo(() => buildCoverageSummary(gapKhoaRows), [gapKhoaRows]);

  const chartRows = useMemo(
    () => maskGapRowsForLens(gapRowsWithLensData(gapKhoaRows, sourceLens), sourceLens),
    [gapKhoaRows, sourceLens],
  );

  const compareSections = useMemo(
    () => [
      { title: "Theo khối", rows: toCompareRows(p.payload?.matrix_khoi) },
      { title: "Theo khu vực", rows: toCompareRows(p.payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng", rows: toCompareRows(p.payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(p.payload?.matrix_hinh_thuc) },
      { title: "Theo cách thức giám sát", rows: toCompareRows(p.payload?.matrix_cach_thuc) },
    ],
    [p.payload],
  );

  return (
    <div className="space-y-[var(--bv103-space-3)] pb-8">
      {p.loadError ? (
        <div className={`${UI.inset} border-red-200 bg-red-50 p-4 text-sm text-red-800`}>{p.loadError}</div>
      ) : null}

      <div id="so-sanh" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-2">
        <SupervisionSourceTabs value={view} onChange={changeView} disabled={p.loading} />
        <p className="text-[11px] text-slate-500">
          Kỳ {p.tuNgay} → {p.denNgay} · {view === "sosanh" ? "so sánh hai nguồn" : `nguồn ${sourceLens === "ksnk" ? "chuyên trách" : "tự giám sát"}`}
        </p>
      </div>

      {view === "sosanh" ? (
        <SupervisionDoiSoatPanel rows={gapKhoaRows} source="gsc" loading={p.loading} />
      ) : (
        <>

      <SupervisionKpiRow
        loading={p.loading}
        items={[
          { label: "Phiên giám sát", value: p.payload?.kpis?.tong_phien ?? 0 },
          { label: "Tiêu chí áp dụng", value: p.payload?.kpis?.tong_quan_sat ?? 0 },
          { label: "Vi phạm", value: p.payload?.kpis?.tong_vi_pham ?? 0 },
          { label: "Tỷ lệ tuân thủ", value: formatPercent2FromRatio(p.payload?.kpis?.tong_dat ?? 0, p.payload?.kpis?.tong_quan_sat ?? 0) },
        ]}
      />

      <SupervisionAttentionBlock alerts={alerts} board={board} loading={p.loading} />

      <SupervisionKeHoachCard loai="GSC" denNgay={p.denNgay} khoaOptions={p.khoaOptions} />

      <SupervisionCoverageCard summary={coverage} tongPhien={p.payload?.kpis?.tong_phien} loading={p.loading} />

      <GscChecklistNavigator
        payload={p.payload}
        loading={p.loading}
        selectedMaBk={selectedMaBk}
        onSelectMaBk={onSelectMaBk}
        bkLabelRecord={p.bkLabelRecord}
        limit={5}
      />

      {selectedMaBk ? (
        <GscBkAnalyticsDashboard
          key={selectedMaBk}
          maBk={selectedMaBk}
          label={selectedLabel}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          khoaOptions={p.khoaOptions}
          selectedKhoaIds={p.selectedKhoaIds}
          onClose={() => onSelectMaBk(null)}
        />
      ) : null}

      <details className={`${UI.shell} group`}>
        <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Chi tiết
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            Thống kê theo khoa · xu hướng · so sánh · đối soát — bấm để mở
          </span>
        </summary>
        <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 p-4">
      <section className={`${UI.shell} w-full min-w-0 p-4`}>
        <header className="mb-4">
          <h2 className="bv103-type-section text-slate-800">Thống kê theo khoa</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Tab tỷ lệ hoặc khối lượng — dưới mốc tham chiếu tô cảnh báo.
            {p.khoaFilterLocked ? " Phạm vi khoa đang khóa." : ""}
          </p>
        </header>
        <SupervisionKhoaAnalyticsBlock
          rows={chartRows}
          matrixKhoaRows={p.payload?.matrix_khoa}
          loading={p.loading}
          moduleLabel="GSC"
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.gscTgsVol}
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.gscKsnkVol}
          sourceLens={sourceLens}
        />
      </section>

      <details className={`${UI.shell}`}>
        <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          So sánh & xu hướng
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            Xu hướng · khối · khu vực · đối tượng — bấm để thu gọn
          </span>
        </summary>
        <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 px-4 pb-4 pt-3">
          <SupervisionTrendChart
            title="Xu hướng tuân thủ"
            data={p.payload?.trendline ?? []}
            loading={p.loading}
            source="gsc"
          />
          <SupervisionCompareAccordion
            sections={compareSections}
            loading={p.loading}
            defaultOpen
            summaryLabel="So sánh theo khối · khu vực · đối tượng · hình thức"
          />
        </div>
      </details>

      <details className={`${UI.shell} group`}>
        <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Nâng cao
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            Bao phủ tự giám sát
          </span>
        </summary>
        <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 px-4 pb-4 pt-3">
          <GscTgsCoverageRankingPanel
            tuNgay={p.tuNgay}
            denNgay={p.denNgay}
            selectedKhoaIds={p.selectedKhoaIds}
          />
        </div>
      </details>
        </div>
      </details>
        </>
      )}
    </div>
  );
}
