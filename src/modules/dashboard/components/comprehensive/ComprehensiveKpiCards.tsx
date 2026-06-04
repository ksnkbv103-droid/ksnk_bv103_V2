"use client";

import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";

const TONE_CLASS = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-900",
  yellow: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-900",
  neutral: "border-slate-200 bg-white text-slate-900",
} as const;

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-[10px] text-slate-400">— so với tuần trước</span>;
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? "text-emerald-700" : "text-red-600"}`}>
      <Icon size={12} aria-hidden />
      {up ? "+" : ""}
      {delta}% so với tuần trước
    </span>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  note,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: number | null;
  note?: string | null;
}) {
  const pct = value.endsWith("%") ? Number.parseFloat(value) : null;
  const tone = complianceToneFromPercent(pct);
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${TONE_CLASS[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">
        {value}
        {suffix ? <span className="ml-1 text-sm font-semibold opacity-60">{suffix}</span> : null}
      </p>
      <div className="mt-2">
        <DeltaBadge delta={delta ?? null} />
      </div>
      {note ? <p className="mt-2 text-[10px] leading-snug opacity-70">{note}</p> : null}
    </div>
  );
}

export function ComprehensiveKpiCards({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const k = payload?.kpis;
  if (!payload) return null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tuân thủ tổng hợp (CCS)"
          value={k?.ty_le_ccs != null ? `${k.ty_le_ccs}%` : "N/A"}
          delta={k?.delta_ccs}
          note={k?.ccs_formula_note}
        />
        <KpiCard label="Vệ sinh tay (VST)" value={k?.ty_le_vst != null ? `${k.ty_le_vst}%` : "N/A"} delta={k?.delta_vst} />
        <KpiCard label="Giám sát chung (GSC)" value={k?.ty_le_gsc != null ? `${k.ty_le_gsc}%` : "N/A"} delta={k?.delta_gsc} />
        <KpiCard
          label="NKBV — tỷ lệ xác nhận/PA"
          value={k?.ti_le_xac_nhan_nkbv != null ? `${k.ti_le_xac_nhan_nkbv}%` : "N/A"}
          suffix={k?.tong_phieu_nkbv != null ? `(${k.tong_phieu_nkbv} phiếu)` : undefined}
          note="Chỉ số kết quả lâm sàng — không gộp vào CCS"
        />
      </div>
      {(payload.sources.vst === "denied" || payload.sources.gsc === "denied" || payload.sources.nkbv === "denied") && (
        <p className="text-xs text-amber-800">
          Một số nguồn bị ẩn do quyền truy cập. Số liệu hiển thị chỉ phản ánh module bạn được xem.
        </p>
      )}
    </div>
  );
}
