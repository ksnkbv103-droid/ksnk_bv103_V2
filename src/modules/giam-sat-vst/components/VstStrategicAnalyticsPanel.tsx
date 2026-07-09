"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useMemo } from "react";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionMomentsPanel,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import type { VstStrategicPayload } from "../types/vst-strategic.types";

type FilterProps = {
  tuNgay: string;
  setTuNgay: (v: string) => void;
  denNgay: string;
  setDenNgay: (v: string) => void;
  khoiOptions: { id: string; label: string }[];
  selectedKhoiIds: string[];
  setSelectedKhoiIds: (v: string[]) => void;
  khoaOptions: { id: string; label: string; khoi_id?: string }[];
  selectedKhoaIds: string[];
  setSelectedKhoaIds: (v: string[]) => void;
  ngheOptions: { id: string; label: string }[];
  selectedNgheIds: string[];
  setSelectedNgheIds: (v: string[]) => void;
  khuVucOptions: { id: string; label: string }[];
  selectedKhuVucIds: string[];
  setSelectedKhuVucIds: (v: string[]) => void;
  selectedHinhThucIds: string[];
  setSelectedHinhThucIds: (v: string[]) => void;
};

type Props = FilterProps & {
  payload: VstStrategicPayload | null;
  loading?: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
  khoaFilterLocked?: boolean;
};

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
      <AnalyticsFilterBar
        variant="compact"
        hideBangKiem
        khoaFilterLocked={p.khoaFilterLocked}
        onRefresh={p.onRefresh}
        refreshLoading={p.loading}
          tuNgay={p.tuNgay}
          setTuNgay={p.setTuNgay}
          denNgay={p.denNgay}
          setDenNgay={p.setDenNgay}
          khoiOptions={p.khoiOptions}
          selectedKhoiIds={p.selectedKhoiIds}
          setSelectedKhoiIds={p.setSelectedKhoiIds}
          khoaOptions={p.khoaOptions}
          selectedKhoaIds={p.selectedKhoaIds}
          setSelectedKhoaIds={p.setSelectedKhoaIds}
          ngheOptions={p.ngheOptions}
          selectedNgheIds={p.selectedNgheIds}
          setSelectedNgheIds={p.setSelectedNgheIds}
          khuVucOptions={p.khuVucOptions}
          selectedKhuVucIds={p.selectedKhuVucIds}
          setSelectedKhuVucIds={p.setSelectedKhuVucIds}
          selectedHinhThucIds={p.selectedHinhThucIds}
          setSelectedHinhThucIds={p.setSelectedHinhThucIds}
      />

      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

      <section className={`${UI.shell} w-full min-w-0 p-4`}>
        <header className="mb-4">
          <h2 className="text-sm font-bold text-slate-800">Thống kê theo khoa</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Tỷ lệ tuân thủ và số cơ hội giám sát — đủ mã khoa trong phạm vi lọc; khoa dưới 80% được tô cảnh báo.
          </p>
        </header>
        <SupervisionKhoaAnalyticsBlock
          rows={gapKhoaRows}
          matrixKhoaRows={p.payload?.matrix_khoa}
          loading={p.loading}
          moduleLabel="VST"
          tgsVolumeLabel="Cơ hội TGS"
          ksnkVolumeLabel="Cơ hội KSNK"
        />
      </section>

      <details className={`${UI.shell} open:shadow-sm`} open>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Tổng hợp chung
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">KPI và xu hướng tuân thủ</span>
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
        </div>
      </details>

      <SupervisionMomentsPanel moments={p.payload?.moments ?? []} loading={p.loading} stroke="#10b981" />

      <details className={`${UI.shell}`}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
          Ma trận phân tích (chức năng phòng, đối tượng, hình thức…)
          <span className="mt-0.5 block text-[11px] font-normal text-slate-400">Mở để xem chi tiết</span>
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-2">
          <SupervisionCompareAccordion sections={compareSections} loading={p.loading} />
        </div>
      </details>
    </div>
  );
}
