"use client";

import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { BaoCaoTrendPoint, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { formatPercent1 } from "@/lib/analytics/supervision-percent";
import { buildBcthVstKpiSlots } from "../../lib/bao-cao-tong-hop-ia";

function prevWeekRate(
  points: BaoCaoTrendPoint[] | undefined,
  metric: "ty_le_vst" | "ty_le_gsc",
): number | null {
  const eligible = (points ?? [])
    .filter((p) => {
      if (metric === "ty_le_vst") return (p.vst_tong ?? 0) > 0 && p.ty_le_vst != null;
      return (p.gsc_tong ?? 0) > 0 && p.ty_le_gsc != null;
    })
    .sort((a, b) => a.min_date.localeCompare(b.min_date));
  if (eligible.length < 2) return null;
  return eligible[eligible.length - 2]![metric] as number;
}

function DeltaLine({
  label,
  delta,
  prevRate,
}: {
  label: string;
  delta: number | null;
  prevRate?: number | null;
}) {
  if (delta == null && prevRate == null) {
    return <span className="bv103-type-label text-slate-400">{label}: —</span>;
  }
  const up = (delta ?? 0) >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="bv103-type-label text-slate-500">
      <span className="mr-1">{label}:</span>
      {prevRate != null ? <span className="mr-1 tabular-nums">{prevRate}% · </span> : null}
      {delta != null ? (
        <span
          className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-[var(--surface-success-text)]" : "text-[var(--surface-danger-text)]"}`}
        >
          <Icon size={12} aria-hidden />
          {up ? "+" : ""}
          {delta}%
        </span>
      ) : (
        <span>—</span>
      )}
    </span>
  );
}

function KpiCard({
  label,
  value,
  suffix,
  weekDelta,
  weekPrev,
  periodDelta,
  periodPrev,
  note,
  volumeNote,
  code,
}: {
  label: string;
  value: string;
  suffix?: string;
  weekDelta?: number | null;
  weekPrev?: number | null;
  periodDelta?: number | null;
  periodPrev?: number | null;
  note?: string | null;
  volumeNote?: string | null;
  code?: string;
}) {
  const pct = value.endsWith("%") ? Number.parseFloat(value) : null;
  const tone = complianceToneFromPercent(pct);
  return (
    <div className={`min-w-0 flex-1 sm:px-4 sm:first:pl-0 ${D.trafficText[tone]}`}>
      <p className={D.kpiLabel}>{label}</p>
      {code ? <p className="font-mono text-[10px] text-slate-400">{code}</p> : null}
      <p className={`mt-[var(--bv103-space-1)] ${D.kpiValue}`}>
        {value}
        {suffix ? <span className="ml-1 bv103-type-body font-medium opacity-70">{suffix}</span> : null}
      </p>
      {volumeNote ? <p className="mt-[var(--bv103-space-1)] bv103-type-label font-medium tabular-nums opacity-80">{volumeNote}</p> : null}
      {weekDelta != null || periodDelta != null ? (
        <div className="mt-[var(--bv103-space-1)]">
          <DeltaLine label="So kỳ gần" delta={periodDelta ?? weekDelta ?? null} prevRate={periodPrev ?? weekPrev} />
        </div>
      ) : null}
      {note ? <p className="mt-[var(--bv103-space-1)] bv103-type-label leading-snug opacity-80">{note}</p> : null}
    </div>
  );
}

export function ComprehensiveKpiCards({ payload }: { payload: BaoCaoTongHopPayload | null }) {

  const k = payload?.kpis;
  const trend = payload?.trend_week;
  const ky = payload?.ky_truoc;
  if (!payload) return null;

  const slots = buildBcthVstKpiSlots(payload);

  return (
    <div className="space-y-[var(--bv103-space-2)]">
      <div className="flex flex-col gap-[var(--bv103-space-3)] sm:flex-row sm:items-start sm:divide-x sm:divide-slate-200 sm:gap-0">
        {slots.map((slot) => (
          <KpiCard
            key={slot.id}
            label={slot.label}
            code={slot.code}
            value={slot.display}
            weekDelta={slot.id === "who" ? k?.delta_vst : undefined}
            weekPrev={slot.id === "who" ? prevWeekRate(trend, "ty_le_vst") : undefined}
            periodDelta={slot.id === "who" ? ky?.delta_vst : undefined}
            periodPrev={slot.id === "who" ? ky?.ty_le_vst : undefined}
            volumeNote={slot.volume}
            note={slot.note}
          />
        ))}
      </div>
      <div className="border-t border-slate-100 pt-[var(--bv103-space-2)]">
        <KpiCard
          label="NKBV — tỷ lệ xác nhận"
          value={k?.ti_le_xac_nhan_nkbv != null ? formatPercent1(k.ti_le_xac_nhan_nkbv) : "N/A"}
          suffix={k?.tong_phieu_nkbv != null ? `(${k.tong_phieu_nkbv} phiếu)` : undefined}
          note="Kết quả nhiễm khuẩn — tách khỏi 3 KPI vệ sinh tay và pool giám sát chung"
        />
      </div>
      <p className="bv103-type-label text-slate-500">
        Mũi tên trên WHO = chênh so với kỳ gần. BM.02 và BM.03 không gộp vào tỷ lệ WHO. Pool giám sát chung nằm ở mục Giám sát chung.
      </p>
      {(payload.sources.vst === "denied" ||
        payload.sources.gsc === "denied" ||
        payload.sources.nkbv === "denied") && (
        <p className={C.noticeWarning}>
          Một số nguồn bị ẩn do quyền truy cập. Số liệu hiển thị chỉ phản ánh module bạn được xem.
        </p>
      )}
    </div>
  );
}
