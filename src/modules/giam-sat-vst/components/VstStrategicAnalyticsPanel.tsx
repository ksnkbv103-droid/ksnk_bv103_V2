"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useMemo } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
      { title: "Theo vùng IPAC (4 màu)", rows: toCompareRows(p.payload?.matrix_khu_vuc_nhom) },
      { title: "Theo khu vực (chi tiết)", rows: toCompareRows(p.payload?.matrix_khu_vuc) },
      { title: "Theo đối tượng (nghề)", rows: toCompareRows(p.payload?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(p.payload?.matrix_hinh_thuc) },
    ],
    [p.payload],
  );

  return (
    <div className={`${UI.sectionGap} space-y-6 px-2 pb-8`}>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <AnalyticsFilterBar
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
      </div>

      {p.loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{p.loadError}</div>
      ) : null}

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
        stroke="#10b981"
      />

      <SupervisionKhoaAnalyticsBlock
        rows={gapKhoaRows}
        loading={p.loading}
        moduleLabel="VST"
        tgsVolumeLabel="Cơ hội TGS"
        ksnkVolumeLabel="Cơ hội KSNK"
        coverageTopics={[{ id: "vst", label: "VST", rows: gapKhoaRows }]}
      />

      <SupervisionMomentsPanel moments={p.payload?.moments ?? []} loading={p.loading} stroke="#10b981" />

      <SupervisionCompareAccordion sections={compareSections} loading={p.loading} />
    </div>
  );
}

export function VstAnalyticsDeepLinkHint() {
  return (
    <Link
      href="/thong-ke/vst"
      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
    >
      Xem chi tiết tại module VST <ExternalLink size={12} />
    </Link>
  );
}
