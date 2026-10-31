"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useEffect, useMemo, useState } from "react";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { SupervisionCoverageCard } from "@/lib/analytics/SupervisionCoverageCard";
import { SupervisionMomentsBars } from "@/lib/analytics/SupervisionMomentsBars";
import { buildCoverageSummary } from "@/lib/analytics/supervision-coverage";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent1FromRatio } from "@/lib/analytics/supervision-percent";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import { VST_COMPARE_MIN_SAMPLE, VST_KHOA_CHART_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";
import { SupervisionAttentionBlock } from "@/lib/analytics/SupervisionAttentionBlock";
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
import type { VstStrategicPayload } from "../types/vst-strategic.types";

type Props = {
  payload: VstStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  khoaFilterLocked?: boolean;
  tuNgay: string;
  denNgay: string;
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  /** GS-02: lens điều khiển fetch RPC; đổi lens → refetch. */
  sourceLens: SupervisionSourceLens;
  onSourceLensChange: (lens: SupervisionSourceLens) => void;
};

/**
 * Thống kê VST, 4 tầng: tổng quan (KPI · độ phủ) · thời điểm WHO · theo khoa · xu hướng và so sánh.
 * Nâng cao: đối soát chuyên trách và tự giám sát.
 */
export default function VstStrategicAnalyticsPanel(p: Props) {
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
  const gapKhoaRows = useMemo(
    () =>
      buildGapKhoaRows(p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions, p.khoaOptions.length),
    [p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions],
  );

  const chartRows = useMemo(
    () => maskGapRowsForLens(gapRowsWithLensData(gapKhoaRows, sourceLens), sourceLens),
    [gapKhoaRows, sourceLens],
  );

  const compareSections = useMemo(
    () => [
      { title: "Theo khối", rows: toCompareRows(p.payload?.matrix_khoi) },
      { title: "Theo khu vực", rows: toCompareRows(p.payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng (nghề)", rows: toCompareRows(p.payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(p.payload?.matrix_hinh_thuc) },
      ...(p.payload?.matrix_cach_thuc?.length
        ? [{ title: "Theo cách thức giám sát", rows: toCompareRows(p.payload.matrix_cach_thuc) }]
        : []),
    ],
    [p.payload],
  );

  const khoaScope = useMemo(
    () => (p.selectedKhoaIds.length ? p.khoaOptions.filter((k) => p.selectedKhoaIds.includes(k.id)) : p.khoaOptions),
    [p.khoaOptions, p.selectedKhoaIds],
  );
  const alerts = useMemo(
    () => buildSupervisionAlerts({ source: "vst", matrixKhoa: p.payload?.matrix_khoa, khoaScope }),
    [p.payload?.matrix_khoa, khoaScope],
  );
  const board = useMemo(
    () => buildActionBoardModel({ source: "vst", matrixKhoa: p.payload?.matrix_khoa, moments: p.payload?.moments, vstKpis: p.payload?.kpis }),
    [p.payload],
  );

  const coverage = useMemo(() => buildCoverageSummary(gapKhoaRows), [gapKhoaRows]);

  return (
    <div className={`${UI.sectionGap} space-y-[var(--bv103-space-3)] pb-8`}>
      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

      <div id="so-sanh" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-2">
        <SupervisionSourceTabs value={view} onChange={changeView} disabled={p.loading} />
        <p className="text-[11px] text-slate-500">
          Kỳ {p.tuNgay} → {p.denNgay} · {view === "sosanh" ? "so sánh hai nguồn" : `nguồn ${sourceLens === "ksnk" ? "chuyên trách" : "tự giám sát"}`}
        </p>
      </div>

      {view === "sosanh" ? (
        <SupervisionDoiSoatPanel rows={gapKhoaRows} source="vst" loading={p.loading} />
      ) : (
        <>

      <SupervisionKpiRow
        loading={p.loading}
        items={[
          { label: "Tỷ lệ tuân thủ", value: formatPercent1FromRatio(p.payload?.kpis?.da_tuan_thu ?? 0, p.payload?.kpis?.tong_co_hoi ?? 0) },
          { label: "Cơ hội quan sát", value: p.payload?.kpis?.tong_co_hoi ?? 0 },
          { label: "Số phiên", value: p.payload?.kpis?.tong_phien ?? 0 },
          { label: "Đã tuân thủ", value: p.payload?.kpis?.da_tuan_thu ?? 0 },
          {
            label: "Kỹ thuật quan sát nhanh (phiếu WHO)",
            value: formatPercent1FromRatio(
              p.payload?.kpis?.dung_ky_thuat ?? 0,
              p.payload?.kpis?.danh_gia_ky_thuat ?? 0,
            ),
          },
        ]}
      />

      <SupervisionAttentionBlock alerts={alerts} board={board} loading={p.loading} />

      <SupervisionCoverageCard summary={coverage} tongPhien={p.payload?.kpis?.tong_phien} loading={p.loading} />

      <SupervisionMomentsBars moments={p.payload?.moments ?? []} loading={p.loading} />

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
            Tab tỷ lệ hoặc khối lượng — dưới {VST_KHOA_CHART_THRESHOLDS.warnPct}% vàng, dưới{" "}
            {VST_KHOA_CHART_THRESHOLDS.redPct}% đỏ.
            {p.khoaFilterLocked ? " Phạm vi khoa đang khóa." : ""}
          </p>
        </header>
        <SupervisionKhoaAnalyticsBlock
          rows={chartRows}
          matrixKhoaRows={p.payload?.matrix_khoa}
          loading={p.loading}
          moduleLabel="VST"
          khoaChartThresholds={VST_KHOA_CHART_THRESHOLDS}
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.vstTgsVol}
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.vstKsnkVol}
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
            source="vst"
            stroke="#10b981"
          />
          <SupervisionCompareAccordion
            sections={compareSections}
            loading={p.loading}
            defaultOpen
            summaryLabel="So sánh theo khối · khu vực · đối tượng · hình thức"
            minSample={VST_COMPARE_MIN_SAMPLE}
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
