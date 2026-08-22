"use client";

import React, { useEffect, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { BaoCaoTrendPoint, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { complianceToneFromPercent } from "../../lib/bao-cao-tong-hop-thresholds";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";
import {
  fetchMucTieuKpiVien,
  type MucTieuKpiMap,
} from "../../actions/dashboard-muc-tieu-kpi.actions";

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
    return <span className="text-[11px] text-slate-400">{label}: —</span>;
  }
  const up = (delta ?? 0) >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="text-[11px] text-slate-500">
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
  periodLabel,
  targetPct,
  note,
  volumeNote,
}: {
  label: string;
  value: string;
  suffix?: string;
  weekDelta?: number | null;
  weekPrev?: number | null;
  periodDelta?: number | null;
  periodPrev?: number | null;
  periodLabel?: string;
  /** Mục tiêu chuẩn viện (%). */
  targetPct?: number | null;
  note?: string | null;
  volumeNote?: string | null;
}) {
  const pct = value.endsWith("%") ? Number.parseFloat(value) : null;
  const tone = complianceToneFromPercent(pct);
  const vsTarget =
    pct != null && targetPct != null && Number.isFinite(targetPct)
      ? Math.round((pct - targetPct) * 10) / 10
      : null;
  return (
    <div className={`rounded-[var(--radius-shell)] border p-5 shadow-sm ${D.kpiCardTone[tone]}`}>
      <p className={D.kpiLabel}>{label}</p>
      <p className={`mt-2 ${D.kpiValue}`}>
        {value}
        {suffix ? <span className="ml-1 text-sm font-medium opacity-70">{suffix}</span> : null}
      </p>
      {targetPct != null ? (
        <p className="mt-1 text-[11px] font-medium tabular-nums opacity-90">
          Mục tiêu viện {targetPct}%
          {vsTarget != null ? (
            <span
              className={`ml-1 ${
                vsTarget >= 0 ? "text-[var(--surface-success-text)]" : "text-[var(--surface-danger-text)]"
              }`}
            >
              (Δ {vsTarget >= 0 ? "+" : ""}
              {vsTarget})
            </span>
          ) : null}
        </p>
      ) : null}
      {volumeNote ? <p className="mt-1 text-xs font-medium tabular-nums opacity-80">{volumeNote}</p> : null}
      {vsTarget == null && (weekDelta != null || periodDelta != null) ? (
        <div className="mt-2 flex flex-col gap-0.5">
          <DeltaLine label="So kỳ gần" delta={periodDelta ?? weekDelta ?? null} prevRate={periodPrev ?? weekPrev} />
        </div>
      ) : null}
      {note ? <p className="mt-2 text-[11px] leading-snug opacity-80">{note}</p> : null}
    </div>
  );
}

export function ComprehensiveKpiCards({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const [targets, setTargets] = useState<MucTieuKpiMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchMucTieuKpiVien().then((t) => {
      if (!cancelled) setTargets(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const k = payload?.kpis;
  const trend = payload?.trend_week;
  const ky = payload?.ky_truoc;
  if (!payload) return null;

  const periodLabel = ky
    ? `vs kỳ trước (${ky.tu_ngay.slice(5)}→${ky.den_ngay.slice(5)})`
    : undefined;

  const vstVol =
    payload.vst?.kpis != null
      ? `${payload.vst.kpis.da_tuan_thu.toLocaleString()}/${payload.vst.kpis.tong_co_hoi.toLocaleString()} tuân thủ`
      : null;
  const gscVol =
    payload.gsc?.kpis != null
      ? `${payload.gsc.kpis.tong_dat.toLocaleString()}/${payload.gsc.kpis.tong_quan_sat.toLocaleString()} đạt`
      : null;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Vệ sinh tay"
          value={k?.ty_le_vst != null ? `${k.ty_le_vst}%` : "N/A"}
          weekDelta={k?.delta_vst}
          weekPrev={prevWeekRate(trend, "ty_le_vst")}
          periodDelta={ky?.delta_vst}
          periodPrev={ky?.ty_le_vst}
          periodLabel={periodLabel}
          targetPct={targets?.ty_le_vst ?? null}
          volumeNote={vstVol ? `Cơ hội: ${vstVol}` : null}
        />
        <KpiCard
          label="Giám sát chung"
          value={k?.ty_le_gsc != null ? `${k.ty_le_gsc}%` : "N/A"}
          weekDelta={k?.delta_gsc}
          weekPrev={prevWeekRate(trend, "ty_le_gsc")}
          periodDelta={ky?.delta_gsc}
          periodPrev={ky?.ty_le_gsc}
          periodLabel={periodLabel}
          targetPct={targets?.ty_le_gsc ?? null}
          volumeNote={gscVol ? `Khảo sát: ${gscVol}` : null}
        />
        <KpiCard
          label="NKBV — tỷ lệ xác nhận"
          value={k?.ti_le_xac_nhan_nkbv != null ? `${k.ti_le_xac_nhan_nkbv}%` : "N/A"}
          suffix={k?.tong_phieu_nkbv != null ? `(${k.tong_phieu_nkbv} phiếu)` : undefined}
          note="Kết quả nhiễm khuẩn — tách khỏi tỷ lệ vệ sinh tay / giám sát chung"
        />
      </div>
      <p className="text-[11px] text-slate-500">
        Mũi tên trên thẻ = chênh so với mục tiêu viện. Xu hướng theo tuần nằm ở mục bên dưới.
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
