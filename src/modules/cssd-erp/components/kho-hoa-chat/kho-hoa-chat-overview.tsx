"use client";

import React from "react";
import { Beaker, CalendarClock, AlertTriangle } from "lucide-react";

type Dm = {
  id: string;
  ma_hoa_chat: string;
};

type Props = {
  countSapHetHan: number;
  countDuoiNguong: number;
  dms: Dm[];
  canEdit: boolean;
  thrDm: string;
  thrVal: string;
  onThrDm: (v: string) => void;
  onThrVal: (v: string) => void;
  onSaveThr: () => void;
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

export default function KhoHoaChatOverview({
  countSapHetHan,
  countDuoiNguong,
  dms,
  canEdit,
  thrDm: _thrDm,
  thrVal: _thrVal,
  onThrDm: _onThrDm,
  onThrVal: _onThrVal,
  onSaveThr: _onSaveThr,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm">
        <StatInline
          label="Hạn ≤ 30 ngày"
          value={countSapHetHan}
          icon={<CalendarClock size={14} className={countSapHetHan > 0 ? "animate-pulse" : undefined} />}
          tone="amber"
        />
        <StatInline
          label="Dưới ngưỡng"
          value={countDuoiNguong}
          icon={<AlertTriangle size={14} className={countDuoiNguong > 0 ? "animate-pulse" : undefined} />}
          tone="rose"
        />
        <StatInline label="Mặt hàng" value={dms.length} icon={<Beaker size={14} />} tone="emerald" />
      </div>

      {canEdit ? (
        <p className="text-[11px] text-slate-500">
          Ngưỡng tồn chỉnh tại Quản trị danh mục hóa chất — không sửa trên ca hàng ngày.
        </p>
      ) : null}
    </div>
  );
}
