"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, ExternalLink } from "lucide-react";
import { buildDecisionQueue, type DecisionQueueItem } from "@/lib/analytics/decision-queue";
import { fetchCommandCenterQueueSignals } from "../../actions/dashboard-decision-queue-signals.actions";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import type { QlcvQuaHanBrief } from "@/modules/quan-ly-cong-viec/actions/qlcv-brief.actions";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type Props = {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  qlcvBrief: QlcvQuaHanBrief | null;
  loading?: boolean;
};

function severityClass(s: DecisionQueueItem["severity"]) {
  return s === "red"
    ? "bg-red-50 text-red-800 border-red-200"
    : "bg-amber-50 text-amber-900 border-amber-200";
}

export function CommandCenterDecisionQueue({
  tuNgay,
  denNgay,
  selectedKhoaIds,
  vstPayload,
  gscPayload,
  qlcvBrief,
  loading,
}: Props) {
  const [cssdRed, setCssdRed] = useState<number | null>(null);
  const [cssdFrozen, setCssdFrozen] = useState<number | null>(null);
  const [nkbvChoXn, setNkbvChoXn] = useState<number | null>(null);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    void fetchCommandCenterQueueSignals({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_id: selectedKhoaIds.length === 1 ? selectedKhoaIds[0] : undefined,
    })
      .then((b) => {
        if (cancelled) return;
        setCssdRed(b.cssd.available ? b.cssd.red_alert_total : null);
        setCssdFrozen(b.cssd.available ? b.cssd.frozen_total : null);
        setNkbvChoXn(b.nkbv.available ? b.nkbv.choXn : null);
      })
      .catch(() => {
        if (!cancelled) {
          setCssdRed(null);
          setCssdFrozen(null);
          setNkbvChoXn(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tuNgay, denNgay, selectedKhoaIds, loading]);

  const items = useMemo(
    () =>
      buildDecisionQueue({
        tuNgay,
        denNgay,
        selectedKhoaIds,
        vstGaps: vstPayload?.gap_analysis ?? null,
        gscGaps: gscPayload?.gap_analysis ?? null,
        checklistOverview: gscPayload?.checklist_overview ?? null,
        cssdRedAlert: cssdRed,
        cssdFrozen: cssdFrozen,
        nkbvChoXn,
        qlcvOverdueCount: qlcvBrief?.totalCount ?? null,
        qlcvOverdueHref: "/quan-ly-cong-viec",
      }),
    [
      tuNgay,
      denNgay,
      selectedKhoaIds,
      vstPayload,
      gscPayload,
      cssdRed,
      cssdFrozen,
      nkbvChoXn,
      qlcvBrief,
    ],
  );

  if (!loading && items.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardList size={18} className="text-[var(--primary)]" aria-hidden />
        <h2 className={D.sectionHeadingSm}>Việc hôm nay</h2>
      </div>
      {loading && items.length === 0 ? (
        <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${severityClass(item.severity)}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    {item.severity === "red" ? "Đỏ" : "Vàng"} ·{" "}
                    {item.domain === "VST"
                      ? "Vệ sinh tay"
                      : item.domain === "GSC"
                        ? "Giám sát chung"
                        : item.domain === "NKBV"
                          ? "Nhiễm khuẩn"
                          : item.domain === "QLCV"
                            ? "Công việc"
                            : "CSSD"}
                  </span>
                  <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                    {item.metricLabel}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-600">{item.detail}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Xem <ExternalLink size={12} aria-hidden />
                </Link>
                {item.createTaskHref ? (
                  <Link
                    href={item.createTaskHref}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <AlertTriangle size={12} aria-hidden /> Giao việc
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
