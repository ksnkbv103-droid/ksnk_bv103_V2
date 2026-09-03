// src/modules/cssd-erp/components/report/ReportDashboard.tsx
"use client";

import React from "react";
import { AlertCircle, Target, Zap, Trophy, ShieldAlert } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";

interface Props {
  stats: {
    total: number;
    incidents: number;
    /** % quy trình không gắn sự cố — không phải CCS / tuân thủ VST–GSC */
    tyLeQuyTrinhKhongSuCo: string;
    bestStation: string;
    worstStation: string;
  };
  alerts: { name: string; rate: string }[];
}

export default function ReportDashboard({ stats, alerts }: Props) {
  return (
    <div className="space-y-[var(--bv103-space-3)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng quy trình" value={stats.total} icon={<Zap size={16} strokeWidth={2} />} color="bg-emerald-50" textColor="text-emerald-700" />
        <StatCard title="Số vụ sự cố" value={stats.incidents} icon={<ShieldAlert size={16} strokeWidth={2} />} color="bg-red-50" textColor="text-red-600" />
        <StatCard
          title="Tỷ lệ quy trình không sự cố"
          value={`${stats.tyLeQuyTrinhKhongSuCo}%`}
          icon={<Target size={16} strokeWidth={2} />}
          color="bg-blue-50"
          textColor="text-blue-700"
          hint="100 − (sự cố ÷ quy trình) × 100 trong kỳ lọc. Không phải CCS / tuân thủ giám sát VST–GSC."
        />
        <StatCard title="Trạm tốt nhất" value={stats.bestStation} icon={<Trophy size={16} strokeWidth={2} />} color="bg-amber-50" textColor="text-amber-700" isStation />
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-3 rounded-[var(--radius-shell)] border border-red-200 bg-red-50 p-4 text-red-900">
          <div className="flex items-center gap-3">
            <div className="rounded-[var(--radius-control)] bg-white p-2 text-red-600 shadow-sm">
              <AlertCircle size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className={bv103DesignTokens.sectionTitle}>Cảnh báo đỏ hệ thống</h4>
              <p className="text-[11px] font-medium text-red-700/80">Trạm có tỷ lệ sai sót vượt ngưỡng an toàn (&gt;5%)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-[var(--radius-control)] border border-red-100 bg-white px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800">Trạm {a.name.replace("_", " ")}</p>
                <p className="mt-0.5 text-xs font-medium text-red-700">Tỷ lệ lỗi: {a.rate}% (&gt;5%)</p>
                <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
                  Gợi ý: Rà soát quy trình và đào tạo lại nhân sự tại khu vực này.
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  textColor,
  isStation,
  hint,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  isStation?: boolean;
  hint?: string;
}) {
  return (
    <div className={`${color} relative flex flex-col gap-2 overflow-hidden rounded-[var(--radius-shell)] border border-white px-4 py-3 shadow-sm`}>
      <div className="relative z-10 flex items-start justify-between gap-2">
        <p className={bv103DesignTokens.labelBlockMuted}>{title}</p>
        <div className={`rounded-lg bg-white p-1.5 shadow-sm ${textColor}`}>{icon}</div>
      </div>
      <div className="relative z-10 space-y-1">
        <p className={isStation ? "bv103-type-label font-semibold uppercase" : "bv103-type-kpi"}>{value}</p>
        {hint ? <p className="text-[11px] font-medium leading-snug text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
}
