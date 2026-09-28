"use client";

import React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { BaoCaoTrendPoint, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";

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
  digits,
}: {
  label: string;
  delta: number | null;
  prevRate?: number | null;
  digits: 1 | 2;
}) {
  if (delta == null && prevRate == null) {
    return <span className="bv103-type-label text-slate-400">{label}: —</span>;
  }
  const fmt = digits === 2 ? formatPercent2 : formatPercent1;
  const up = (delta ?? 0) >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="bv103-type-label text-slate-500">
      <span className="mr-1">{label}:</span>
      {prevRate != null ? <span className="mr-1 tabular-nums">{fmt(prevRate)} · </span> : null}
      {delta != null ? (
        <span
          className={`inline-flex items-center gap-0.5 font-medium ${up ? "text-[var(--surface-success-text)]" : "text-[var(--surface-danger-text)]"}`}
        >
          <Icon size={12} aria-hidden />
          {delta > 0 ? "+" : ""}
          {fmt(delta)}
        </span>
      ) : (
        <span>—</span>
      )}
    </span>
  );
}

function shortDayMonth(iso: string): string {
  const [, m, d] = iso.split("-");
  if (!m || !d) return iso;
  return `${d}-${m}`;
}

function KpiCard({
  label,
  value,
  suffix,
  digits,
  weekDelta,
  weekPrev,
  periodDelta,
  periodPrev,
  periodLabel,
  note,
  volumeNote,
}: {
  label: string;
  value: string;
  suffix?: string;
  digits: 1 | 2;
  weekDelta?: number | null;
  weekPrev?: number | null;
  periodDelta?: number | null;
  periodPrev?: number | null;
  periodLabel?: string | null;
  note?: string | null;
  volumeNote?: string | null;
}) {
  const pct = value.endsWith("%") ? Number.parseFloat(value) : null;
  const tone = complianceToneFromPercent(pct);
  return (
    <div className={`min-w-0 flex-1 sm:px-4 sm:first:pl-0 ${D.trafficText[tone]}`}>
      <p className={D.kpiLabel}>{label}</p>
      <p className={`mt-[var(--bv103-space-1)] ${D.kpiValue}`}>
        {value}
        {suffix ? <span className="ml-1 bv103-type-body font-medium opacity-70">{suffix}</span> : null}
      </p>
      {volumeNote ? <p className="mt-[var(--bv103-space-1)] bv103-type-label font-medium tabular-nums opacity-80">{volumeNote}</p> : null}
      {weekDelta != null || periodDelta != null ? (
        <div className="mt-[var(--bv103-space-1)] flex flex-col gap-0.5">
          {weekDelta != null ? (
            <DeltaLine label="Δ 2 tuần" delta={weekDelta} prevRate={weekPrev} digits={digits} />
          ) : null}
          {periodDelta != null && periodLabel ? (
            <DeltaLine label={periodLabel} delta={periodDelta} prevRate={periodPrev} digits={digits} />
          ) : null}
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

  const vstVol =
    payload.vst?.kpis != null
      ? `${payload.vst.kpis.da_tuan_thu.toLocaleString()}/${payload.vst.kpis.tong_co_hoi.toLocaleString()} tuân thủ`
      : null;
  const gscVol =
    payload.gsc?.kpis != null
      ? `${payload.gsc.kpis.tong_dat.toLocaleString()}/${payload.gsc.kpis.tong_quan_sat.toLocaleString()} đạt`
      : null;
  const periodLabel = ky
    ? `vs kỳ trước (${shortDayMonth(ky.tu_ngay)}→${shortDayMonth(ky.den_ngay)})`
    : null;

  return (
    <div className="space-y-[var(--bv103-space-2)]">
      <div className="flex flex-col gap-[var(--bv103-space-3)] sm:flex-row sm:items-start sm:divide-x sm:divide-slate-200 sm:gap-0">
        <KpiCard
          label="Vệ sinh tay"
          digits={1}
          value={k?.ty_le_vst != null ? formatPercent1(k.ty_le_vst) : "N/A"}
          weekDelta={k?.delta_vst}
          weekPrev={prevWeekRate(trend, "ty_le_vst")}
          periodDelta={ky?.delta_vst}
          periodPrev={ky?.ty_le_vst}
          periodLabel={periodLabel}
          volumeNote={vstVol ? `Cơ hội: ${vstVol}` : null}
        />
        <KpiCard
          label="Giám sát chung"
          digits={2}
          value={k?.ty_le_gsc != null ? formatPercent2(k.ty_le_gsc) : "N/A"}
          weekDelta={k?.delta_gsc}
          weekPrev={prevWeekRate(trend, "ty_le_gsc")}
          periodDelta={ky?.delta_gsc}
          periodPrev={ky?.ty_le_gsc}
          periodLabel={periodLabel}
          volumeNote={gscVol ? `Khảo sát: ${gscVol}` : null}
        />
        <KpiCard
          label="NKBV — tỷ lệ xác nhận"
          digits={1}
          value={k?.ti_le_xac_nhan_nkbv != null ? `${k.ti_le_xac_nhan_nkbv}%` : "N/A"}
          suffix={k?.tong_phieu_nkbv != null ? `(${k.tong_phieu_nkbv} phiếu)` : undefined}
          note="Kết quả nhiễm khuẩn — tách khỏi tỷ lệ vệ sinh tay / giám sát chung"
        />
      </div>
      <p className="bv103-type-label text-slate-500">
        Δ 2 tuần = hai tuần ISO liền kề trên xu hướng. Dòng kỳ trước = cùng độ dài kỳ lọc, lùi liền trước.
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
