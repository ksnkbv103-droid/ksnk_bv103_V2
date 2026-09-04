// src/modules/cssd-erp/components/report/ReportDashboard.tsx
"use client";

import React from "react";
import { AlertCircle } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

interface Props {
  stats: {
    total: number;
    incidents: number;
    /** % quy trình không gắn sự cố — chỉ số CSSD riêng, không phải tuân thủ VST–GSC */
    tyLeQuyTrinhKhongSuCo: string;
    bestStation: string;
    worstStation: string;
  };
  alerts: { name: string; rate: string }[];
}

export default function ReportDashboard({ stats, alerts }: Props) {
  return (
    <div className="space-y-2">
      {/* Compact KPI strip — not 4-col StatCard wall */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px]">
        <span className="font-semibold text-slate-800">
          Quy trình <span className="tabular-nums text-emerald-700">{stats.total}</span>
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="font-semibold text-red-700">
          Sự cố <span className="tabular-nums">{stats.incidents}</span>
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span
          className="text-blue-800"
          title="100 − (sự cố ÷ quy trình) × 100 trong kỳ lọc. Chỉ số CSSD riêng — không phải tuân thủ giám sát VST–GSC."
        >
          Không sự cố{" "}
          <span className="font-semibold tabular-nums">{stats.tyLeQuyTrinhKhongSuCo}%</span>
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="text-amber-800">
          Trạm tốt <span className="font-semibold">{stats.bestStation || "—"}</span>
        </span>
        {stats.worstStation ? (
          <>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span className="text-slate-600">
              Cần xem <span className="font-semibold">{stats.worstStation}</span>
            </span>
          </>
        ) : null}
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-1.5 rounded-[var(--radius-shell)] border border-red-200 bg-red-50/80 px-3 py-2 text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} strokeWidth={2.5} className="shrink-0 text-red-600" />
            <h4 className={`${bv103DesignTokens.sectionTitle} text-sm`}>Cảnh báo đỏ</h4>
            <span className="text-[11px] font-medium text-red-700/80">
              Trạm sai sót &gt;5%
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {alerts.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2 py-1 text-[11px]"
              >
                <span className="font-semibold text-slate-800">{a.name.replace("_", " ")}</span>
                <span className="font-medium text-red-700">{a.rate}%</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
