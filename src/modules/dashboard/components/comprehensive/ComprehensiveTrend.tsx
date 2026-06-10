"use client";

import React, { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { BaoCaoTongHopPayload, BaoCaoTrendGranularity } from "../../types/bao-cao-tong-hop.types";
import { pickTrend } from "../../lib/bao-cao-tong-hop-core";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

const GRANULARITY_OPTIONS: { id: BaoCaoTrendGranularity; label: string }[] = [
  { id: "week", label: "Theo tuần" },
  { id: "month", label: "Theo tháng" },
  { id: "quarter", label: "Theo quý" },
  { id: "year", label: "Theo năm" },
];

export function ComprehensiveTrend({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const [granularity, setGranularity] = useState<BaoCaoTrendGranularity>("week");

  const data = useMemo(() => {
    if (!payload) return [];
    return pickTrend(payload.trend_week, granularity);
  }, [payload, granularity]);

  if (!payload || data.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
          <TrendingUp size={18} className="text-[var(--primary)]" aria-hidden />
          Xu hướng tuân thủ (process)
        </h2>
        <div className="flex flex-wrap rounded-lg border border-slate-200 p-0.5 text-xs font-bold">
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
      <p className="mb-4 text-xs text-slate-500">VST, GSC và CCS — NKBV xem biểu đồ riêng bên dưới.</p>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ty_le_vst" name="VST (%)" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="ty_le_gsc" name="GSC (%)" stroke="#38bdf8" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="ty_le_ccs" name="CCS (%)" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
