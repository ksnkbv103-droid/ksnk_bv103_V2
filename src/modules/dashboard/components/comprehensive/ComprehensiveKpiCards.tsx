"use client";

import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta == null) return <span className="text-[11px] text-slate-400">— so với tuần trước</span>;
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${up ? "text-[var(--surface-success-text)]" : "text-[var(--surface-danger-text)]"}`}>
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
    <div className={`rounded-2xl border p-5 shadow-sm ${D.kpiCardTone[tone]}`}>
      <p className={D.kpiLabel}>{label}</p>
      <p className={`mt-2 ${D.kpiValue}`}>
        {value}
        {suffix ? <span className="ml-1 text-sm font-medium opacity-70">{suffix}</span> : null}
      </p>
      <div className="mt-2">
        <DeltaBadge delta={delta ?? null} />
      </div>
      {note ? <p className="mt-2 text-[11px] leading-snug opacity-80">{note}</p> : null}
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
        <p className={C.noticeWarning}>Một số nguồn bị ẩn do quyền truy cập. Số liệu hiển thị chỉ phản ánh module bạn được xem.</p>
      )}
    </div>
  );
}
