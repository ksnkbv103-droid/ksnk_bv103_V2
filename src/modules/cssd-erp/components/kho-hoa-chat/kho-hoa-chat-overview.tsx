"use client";

import React from "react";
import { Beaker, CalendarClock, AlertTriangle } from "lucide-react";

type Props = {
  countSapHetHan: number;
  countDuoiNguong: number;
  dmCount: number;
};

function StatInline({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "amber" | "rose" | "emerald";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-600" : tone === "rose" ? "text-rose-600" : "text-emerald-600";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold ${toneClass}`}>
      {icon}
      <span className="text-slate-500">{label}</span>
      <span className="tabular-nums text-slate-800">{value}</span>
    </span>
  );
}

/** Chỉ số tồn — danh sách cảnh báo nằm ở banner phía trên. */
export default function KhoHoaChatOverview({ countSapHetHan, countDuoiNguong, dmCount }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
      <StatInline
        label="Hạn ≤ 30 ngày"
        value={countSapHetHan}
        icon={<CalendarClock size={14} />}
        tone="amber"
      />
      <StatInline
        label="Dưới ngưỡng"
        value={countDuoiNguong}
        icon={<AlertTriangle size={14} />}
        tone="rose"
      />
      <StatInline label="Mặt hàng" value={dmCount} icon={<Beaker size={14} />} tone="emerald" />
    </div>
  );
}
