"use client";

import { gscFormChrome as UI } from "@/modules/giam-sat-chung/lib/gsc-form-chrome";

import React, { useMemo } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AnalyticsFilterBar } from "@/components/shared/AnalyticsFilterBar";
import {
  SupervisionCompareGrid,
  SupervisionGapChart,
  SupervisionKpiRow,
  SupervisionTrendChart,
  percentTooltipFormatter,
} from "@/lib/analytics/supervision-analytics-charts";
import { toCompareRows, mapGapRowsForKhoaMa } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2, roundPercent2 } from "@/lib/analytics/supervision-percent";
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
};

export default function VstStrategicAnalyticsPanel(p: Props) {
  const compareSections = useMemo(
    () => [
      { title: "Theo khoa", rows: toCompareRows(p.payload?.matrix_khoa, { khoaMa: true }) },
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SupervisionTrendChart
          title="Xu hướng tuân thủ"
          data={p.payload?.trendline ?? []}
          loading={p.loading}
          stroke="#10b981"
        />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-800">5 thời điểm WHO</h3>
          <div className="h-[240px]">
            {(p.payload?.moments?.length ?? 0) > 0 && !p.loading ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={(p.payload?.moments ?? []).map((m) => ({
                    ...m,
                    ty_le_tuan_thu: roundPercent2(m.ty_le_tuan_thu),
                  }))}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="ten" tick={{ fontSize: 9 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} />
                  <Tooltip formatter={percentTooltipFormatter} />
                  <Radar
                    name="Tuân thủ %"
                    dataKey="ty_le_tuan_thu"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">
                {p.loading ? "Đang tải…" : "Chưa có dữ liệu"}
              </p>
            )}
          </div>
        </div>
      </div>

      <SupervisionCompareGrid sections={compareSections} loading={p.loading} />

      <SupervisionGapChart
        title="Đối soát Tự giám sát vs KSNK (theo khoa)"
        rows={mapGapRowsForKhoaMa(p.payload?.gap_analysis)}
        loading={p.loading}
      />

      {(p.payload?.moments?.length ?? 0) > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-slate-800">Tuân thủ theo thời điểm (cột)</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(p.payload?.moments ?? []).map((m) => ({
                  ...m,
                  ty_le_tuan_thu: roundPercent2(m.ty_le_tuan_thu),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ten" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={percentTooltipFormatter} />
                <Legend />
                <Bar dataKey="ty_le_tuan_thu" name="Tuân thủ %" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
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
