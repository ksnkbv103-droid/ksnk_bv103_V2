// src/modules/cssd-erp/components/report/ReportDashboard.tsx
"use client";

import React from "react";
import { AlertCircle, Target, Zap, Trophy, ShieldAlert } from "lucide-react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

interface Props {
  stats: { total: number; incidents: number; compliance: string; bestStation: string; worstStation: string };
  alerts: { name: string; rate: string }[];
}

export default function ReportDashboard({ stats, alerts }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng quy trình" value={stats.total} icon={<Zap size={20} strokeWidth={2} />} color="bg-emerald-50" textColor="text-emerald-700" />
        <StatCard title="Số vụ sự cố" value={stats.incidents} icon={<ShieldAlert size={20} strokeWidth={2} />} color="bg-red-50" textColor="text-red-600" />
        <StatCard title="Tỷ lệ tuân thủ" value={`${stats.compliance}%`} icon={<Target size={20} strokeWidth={2} />} color="bg-blue-50" textColor="text-blue-700" />
        <StatCard title="Trạm tốt nhất" value={stats.bestStation} icon={<Trophy size={20} strokeWidth={2} />} color="bg-amber-50" textColor="text-amber-700" isStation />
      </div>

      {alerts.length > 0 && (
        <div className="space-y-4 rounded-2xl bg-red-600 p-6 text-white shadow-lg md:p-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-3">
              <AlertCircle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className={bv103DesignTokens.sectionTitle}>Cảnh báo đỏ hệ thống</h4>
              <p className="text-[11px] font-medium text-red-100">Trạm có tỷ lệ sai sót vượt ngưỡng an toàn (&gt;5%)</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {alerts.map((a, i) => (
              <div key={i} className={`p-5 ${bv103LayoutChrome.panelSurface} bg-black/10 text-white ring-0`}>
                <p className="text-sm font-semibold uppercase">Trạm {a.name.replace("_", " ")}</p>
                <p className="mt-1 text-sm font-medium text-red-100">Tỷ lệ lỗi: {a.rate}% (&gt;5%)</p>
                <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-red-50/90">
                  Gợi ý: Rà soát quy trình và đào tạo lại nhân sự tại khu vực này.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
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
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  isStation?: boolean;
}) {
  return (
    <div className={`${color} relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-white p-6 shadow-sm`}>
      <div className="relative z-10 flex items-start justify-between">
        <p className={bv103DesignTokens.labelBlockMuted}>{title}</p>
        <div className={`rounded-xl bg-white p-2.5 shadow-sm ${textColor}`}>{icon}</div>
      </div>
      <p className={`relative z-10 font-semibold tracking-tight ${isStation ? "text-base uppercase" : "text-3xl"}`}>{value}</p>
    </div>
  );
}
