"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useMemo } from "react";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionMomentsPanel,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
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
 * Nội dung thống kê VST — bộ lọc nằm ở `Bv103AnalyticsPageFrame.filterBar` (sticky, luôn hiện).
 */
export default function VstStrategicAnalyticsPanel(p: Props) {
  const gapKhoaRows = useMemo(
    () =>
      buildGapKhoaRows(p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions, p.khoaOptions.length),
    [p.payload?.gap_analysis, p.selectedKhoaIds, p.khoaOptions],
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
    <div className={`${UI.sectionGap} space-y-6 pb-8`}>
      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

      <section className={`${UI.shell} w-full min-w-0 p-4`}>
        <header className="mb-4">
          <h2 className="text-sm font-bold text-slate-800">Thống kê theo khoa</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Tỷ lệ tuân thủ và số cơ hội giám sát — đủ mã khoa trong phạm vi lọc; khoa dưới 80% được tô cảnh báo.
            {p.khoaFilterLocked ? " Phạm vi khoa đang khóa." : ""} Kỳ {p.tuNgay} → {p.denNgay}.
          </p>
        </header>
        <SupervisionKhoaAnalyticsBlock
          rows={gapKhoaRows}
          matrixKhoaRows={p.payload?.matrix_khoa}
          loading={p.loading}
          moduleLabel="VST"
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.vstTgsVol}
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.vstKsnkVol}
        />
      </section>

      <SupervisionMomentsPanel moments={p.payload?.moments ?? []} loading={p.loading} stroke="#10b981" />

      <details className={`${UI.shell}`}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Xem thêm
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">
            KPI · xu hướng · so sánh khối / nghề / hình thức
          </span>
        </summary>
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
          <SupervisionKpiRow
            loading={p.loading}
            items={[
              { label: "Tỷ lệ tuân thủ", value: formatPercent2(p.payload?.kpis?.ty_le_tuan_thu ?? 0) },
              { label: "Cơ hội quan sát", value: p.payload?.kpis?.tong_co_hoi ?? 0 },
              { label: "Đã tuân thủ", value: p.payload?.kpis?.da_tuan_thu ?? 0 },
              { label: "Đúng kỹ thuật", value: formatPercent2(p.payload?.kpis?.ty_le_dung_ky_thuat ?? 0) },
            ]}
          />
          <SupervisionTrendChart
            title="Xu hướng tuân thủ"
            data={p.payload?.trendline ?? []}
            loading={p.loading}
            source="vst"
            stroke="#10b981"
          />
          <SupervisionCompareAccordion sections={compareSections} loading={p.loading} />
        </div>
      </details>
    </div>
  );
}
