"use client";

import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { SupervisionResponsiveChart } from "@/lib/analytics/supervision-charts-shared";
import type { BaoCaoTongHopPayload, BaoCaoTrendGranularity } from "../../types/bao-cao-tong-hop.types";
import { pickTrend } from "../../lib/bao-cao-tong-hop-core";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import {
  CHUYEN_DE_LINE_COLORS,
  type ChuyenDeTrendSeries,
  mergeMultiChuyenDeTrendRows,
} from "../../lib/chuyen-de-trend-series";

const GRANULARITY_OPTIONS: { id: BaoCaoTrendGranularity; label: string }[] = [
  { id: "week", label: "Theo tuần" },
  { id: "month", label: "Theo tháng" },
  { id: "quarter", label: "Theo quý" },
  { id: "year", label: "Theo năm" },
];

export type ComprehensiveTrendProps = {
  payload: BaoCaoTongHopPayload | null;
  /** Khi chọn ≥1 BK: mỗi chuyên đề một line. Khi rỗng/Tất cả: một line GSC tổng. */
  chuyenDeSeries?: ChuyenDeTrendSeries[];
  selectedBangKiemMas?: string[];
};

export function ComprehensiveTrend({
  payload,
  chuyenDeSeries = [],
  selectedBangKiemMas = [],
}: ComprehensiveTrendProps) {
  const [granularity, setGranularity] = useState<BaoCaoTrendGranularity>("week");
  const multiMode = selectedBangKiemMas.length > 0 && chuyenDeSeries.length > 0;

  const aggData = useMemo(() => {
    if (!payload) return [];
    return pickTrend(payload.trend_week, granularity);
  }, [payload, granularity]);

  const multiData = useMemo(() => {
    if (!multiMode) return [];
    return mergeMultiChuyenDeTrendRows(chuyenDeSeries, granularity);
  }, [multiMode, chuyenDeSeries, granularity]);

  const data = multiMode ? multiData : aggData;
  const showVst = !multiMode && aggData.some((p) => (p.vst_tong ?? 0) > 0 && p.ty_le_vst != null);
  const showGsc = !multiMode && aggData.some((p) => (p.gsc_tong ?? 0) > 0 && p.ty_le_gsc != null);

  if (!payload || data.length === 0) return null;

  return (
    <section className={`${D.shellPadded}`}>
      <div className="mb-[var(--bv103-space-3)] flex flex-wrap items-center justify-between gap-[var(--bv103-space-2)]">
        <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
          <TrendingUp size={18} className="text-[var(--primary)]" aria-hidden />
          Xu hướng tuân thủ
        </h2>
        <div className="flex flex-wrap rounded-lg border border-slate-200 p-0.5 bv103-type-label font-semibold">
          {GRANULARITY_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setGranularity(id)}
              className={`rounded-md px-3 py-1.5 ${granularity === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        {multiMode
          ? `Mỗi chuyên đề (bảng kiểm) một đường màu riêng · ${chuyenDeSeries.length} chuyên đề đã chọn.`
          : "VST và GSC tổng hợp khi chọn tất cả chuyên đề. NKBV xem biểu đồ riêng bên dưới."}
      </p>
      <div className="h-[300px] min-w-0">
        <SupervisionResponsiveChart className="h-full w-full min-w-0">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            {multiMode
              ? chuyenDeSeries.map((s, i) => (
                  <Line
                    key={s.ma_bk}
                    type="monotone"
                    dataKey={s.dataKey}
                    name={s.name}
                    stroke={CHUYEN_DE_LINE_COLORS[i % CHUYEN_DE_LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))
              : null}
            {!multiMode && showVst ? (
              <Line
                type="monotone"
                dataKey="ty_le_vst"
                name="VST (%)"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ) : null}
            {!multiMode && showGsc ? (
              <Line
                type="monotone"
                dataKey="ty_le_gsc"
                name="GSC (%)"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ) : null}
          </LineChart>
        </SupervisionResponsiveChart>
      </div>
    </section>
  );
}
