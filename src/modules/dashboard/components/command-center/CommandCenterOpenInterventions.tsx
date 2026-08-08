"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  fetchOpenAnalyticsInterventions,
  type OpenInterventionRow,
} from "../../actions/dashboard-open-interventions.actions";
import { fetchCommandCenterFourPillarsBrief } from "../../actions/dashboard-four-pillars-brief.actions";
import {
  computePdcaDelta,
  labelAnalyticsChiSo,
  resolveCurrentAnalyticsMetric,
} from "@/lib/analytics/pdca-remeasure";
import { computeTyLeGsc, computeTyLeVst, computeCcs } from "@/lib/analytics/supervision-metrics";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type Props = {
  loading?: boolean;
  tuNgay?: string;
  denNgay?: string;
  selectedKhoaIds?: string[];
  vstPayload?: VstStrategicPayload | null;
  gscPayload?: GscStrategicPayload | null;
};

export function CommandCenterOpenInterventions({
  loading,
  tuNgay,
  denNgay,
  selectedKhoaIds = [],
  vstPayload,
  gscPayload,
}: Props) {
  const [rows, setRows] = useState<OpenInterventionRow[]>([]);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cssdRedAlert, setCssdRedAlert] = useState<number | null>(null);
  const [nkbvChoXn, setNkbvChoXn] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setBusy(true);
    void fetchOpenAnalyticsInterventions(8)
      .then((res) => {
        if (cancelled) return;
        setAvailable(res.available);
        setRows(res.rows);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading]);

  useEffect(() => {
    if (loading || !tuNgay || !denNgay) return;
    let cancelled = false;
    void fetchCommandCenterFourPillarsBrief({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_id: selectedKhoaIds.length === 1 ? selectedKhoaIds[0] : undefined,
    })
      .then((b) => {
        if (cancelled) return;
        setCssdRedAlert(b.cssd.available ? b.cssd.red_alert_total : null);
        setNkbvChoXn(b.nkbv.available ? b.nkbv.choXn : null);
      })
      .catch(() => {
        if (!cancelled) {
          setCssdRedAlert(null);
          setNkbvChoXn(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loading, tuNgay, denNgay, selectedKhoaIds]);

  const metricCtx = useMemo(() => {
    const tyLeVst = computeTyLeVst(vstPayload?.kpis);
    const tyLeGsc = computeTyLeGsc(gscPayload?.kpis);
    const tyLeCcs = computeCcs(tyLeVst, tyLeGsc).value;
    const khoaTyLeById: Record<string, { ty_le_vst?: number | null; ty_le_gsc?: number | null }> = {};
    for (const g of vstPayload?.gap_analysis ?? []) {
      const id = String((g as { id?: string }).id || "").trim();
      if (!id) continue;
      khoaTyLeById[id] = {
        ...khoaTyLeById[id],
        ty_le_vst: (g as { ty_le_ksnk?: number | null }).ty_le_ksnk ?? null,
      };
    }
    for (const g of gscPayload?.gap_analysis ?? []) {
      const id = String((g as { id?: string }).id || "").trim();
      if (!id) continue;
      khoaTyLeById[id] = {
        ...khoaTyLeById[id],
        ty_le_gsc: (g as { ty_le_ksnk?: number | null }).ty_le_ksnk ?? null,
      };
    }
    return {
      tyLeVst,
      tyLeGsc,
      tyLeCcs,
      cssdRedAlert,
      nkbvChoXn,
      khoaTyLeById,
    };
  }, [vstPayload, gscPayload, cssdRedAlert, nkbvChoXn]);

  if (!available || (rows.length === 0 && !busy)) return null;

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <RefreshCw size={16} className="text-indigo-600" aria-hidden />
        <h2 className={D.sectionHeadingSm}>Can thiệp đang mở (PDCA)</h2>
      </div>
      {busy && rows.length === 0 ? (
        <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {rows.map((r) => {
            const current = resolveCurrentAnalyticsMetric(r.chi_so, {
              ...metricCtx,
              khoaId: r.khoa_id,
            });
            const delta =
              r.den_han_do_lai ? computePdcaDelta(r.gia_tri_luc_tao, current) : null;
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">{r.tieu_de}</p>
                  <p className="text-[11px] text-slate-500">
                    Chỉ số <span className="font-semibold text-slate-700">{labelAnalyticsChiSo(r.chi_so)}</span>
                    {r.ky_do_lai ? ` · đo lại ${r.ky_do_lai}` : ""}
                    {r.gia_tri_luc_tao != null ? ` · lúc tạo ${r.gia_tri_luc_tao}` : ""}
                    {r.den_han_do_lai ? (
                      <span className="ml-1 font-semibold text-amber-700">· Đến hạn đo lại</span>
                    ) : null}
                    {delta != null ? (
                      <span
                        className={`ml-1 font-semibold tabular-nums ${
                          delta >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        · Δ {delta >= 0 ? "+" : ""}
                        {delta}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Link
                  href={`/quan-ly-cong-viec?id=${encodeURIComponent(r.id)}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]"
                >
                  Mở việc <ExternalLink size={12} aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
