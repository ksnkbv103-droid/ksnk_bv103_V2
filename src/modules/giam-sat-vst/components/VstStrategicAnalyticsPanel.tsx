"use client";

import { vstFormChrome as UI } from "@/modules/giam-sat-vst/lib/vst-form-chrome";

import React, { useMemo, useState } from "react";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent1FromRatio } from "@/lib/analytics/supervision-percent";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import { VST_KHOA_CHART_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";
import { SupervisionSourceLensToggle } from "@/lib/analytics/SupervisionSourceLensToggle";
import { SupervisionDoiSoatPanel } from "@/lib/analytics/SupervisionDoiSoatPanel";
import {
  buildActionBoardFromGap,
  gapRowsWithLensData,
  maskGapRowsForLens,
  type SupervisionSourceLens,
} from "@/lib/analytics/supervision-source-lens";
import { SupervisionActionBoard } from "@/lib/analytics/SupervisionActionBoard";
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
};

/**
 * Thống kê VST — fold 0: toggle nguồn · Action board 1-lens · chart khoa · so sánh.
 * Nâng cao: đối soát · KPI. Cấm dual % TGS+KSNK (Action board A).
 */
export default function VstStrategicAnalyticsPanel(p: Props) {
  const [sourceLens, setSourceLens] = useState<SupervisionSourceLens>("ksnk");
  const gapKhoaRows = useMemo(
    () =>
      buildGapKhoaRows(p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions, p.khoaOptions.length),
    [p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions],
  );

  const chartRows = useMemo(
    () => maskGapRowsForLens(gapRowsWithLensData(gapKhoaRows, sourceLens), sourceLens),
    [gapKhoaRows, sourceLens],
  );

  // Action board A: fold-0 một lens — cấm dual % TGS+KSNK
  const actionBoard = useMemo(
    () =>
      buildActionBoardFromGap({
        source: "vst",
        lens: sourceLens,
        gapRows: gapKhoaRows,
        moments: p.payload?.moments ?? [],
        topViolations: [],
        vstKpis: p.payload?.kpis ?? null,
      }),
    [gapKhoaRows, sourceLens, p.payload?.moments, p.payload?.kpis],
  );

  const compareSections = useMemo(
    () => [
      { title: "Theo khối", rows: toCompareRows(p.payload?.matrix_khoi) },
      { title: "Theo chức năng phòng", rows: toCompareRows(p.payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng (nghề)", rows: toCompareRows(p.payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(p.payload?.matrix_hinh_thuc) },
      ...(p.payload?.matrix_cach_thuc?.length
        ? [{ title: "Theo cách thức giám sát", rows: toCompareRows(p.payload.matrix_cach_thuc) }]
        : []),
    ],
    [p.payload],
  );

  return (
    <div className={`${UI.sectionGap} space-y-[var(--bv103-space-3)] pb-8`}>
      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

      <div id="so-sanh" className="scroll-mt-24 flex flex-wrap items-center justify-between gap-2">
        <SupervisionSourceLensToggle value={sourceLens} onChange={setSourceLens} disabled={p.loading} />
        <p className="text-[11px] text-slate-500">
          Kỳ {p.tuNgay} → {p.denNgay} · nguồn {sourceLens === "ksnk" ? "chuyên trách" : "tự giám sát"}
        </p>
      </div>

      <SupervisionActionBoard model={actionBoard} loading={p.loading} />

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

      <details className={`${UI.shell}`} open>
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
            defaultOpen={false}
            summaryLabel="So sánh theo khối · khu vực · đối tượng · hình thức"
          />
        </div>
      </details>

      <details className={`${UI.shell}`}>
        <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Nâng cao
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            Đối soát · KPI thô
          </span>
        </summary>
        <div className="space-y-[var(--bv103-space-3)] border-t border-slate-100 px-4 pb-4 pt-3">
          <SupervisionDoiSoatPanel rows={gapKhoaRows} source="vst" loading={p.loading} />
          <SupervisionKpiRow
            loading={p.loading}
            items={[
              { label: "Tỷ lệ tuân thủ", value: formatPercent1FromRatio(p.payload?.kpis?.da_tuan_thu ?? 0, p.payload?.kpis?.tong_co_hoi ?? 0) },
              { label: "Cơ hội quan sát", value: p.payload?.kpis?.tong_co_hoi ?? 0 },
              { label: "Đã tuân thủ", value: p.payload?.kpis?.da_tuan_thu ?? 0 },
              { label: "Đúng kỹ thuật", value: formatPercent1FromRatio(p.payload?.kpis?.dung_ky_thuat ?? 0, p.payload?.kpis?.tong_co_hoi ?? 0) },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
