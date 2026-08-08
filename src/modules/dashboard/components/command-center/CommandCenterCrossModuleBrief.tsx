"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ExternalLink, Package, Snowflake } from "lucide-react";
import {
  fetchCommandCenterCrossModuleBrief,
  type CrossModuleBrief,
} from "../../actions/dashboard-cross-module-brief.actions";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import {
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";

type Props = {
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  loading?: boolean;
};

export function CommandCenterCrossModuleBrief({ tuNgay, denNgay, selectedKhoaIds, loading }: Props) {
  const [brief, setBrief] = useState<CrossModuleBrief | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setBusy(true);
    void fetchCommandCenterCrossModuleBrief({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_id: selectedKhoaIds.length === 1 ? selectedKhoaIds[0] : undefined,
    })
      .then((data) => {
        if (!cancelled) setBrief(data);
      })
      .catch(() => {
        if (!cancelled) setBrief(null);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tuNgay, denNgay, selectedKhoaIds, loading]);

  if (!brief && !busy) return null;
  if (brief && !brief.nkbv.available && !brief.cssd.available) return null;

  const nkbvBlocked =
    isPilotCoreModulesScopeEnabled() && isPathBlockedUnderPilotCoreModules("/giam-sat-nkbv");
  const nkbvHref = buildAnalyticsDeepLink(
    "/giam-sat-nkbv",
    {
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_ids: selectedKhoaIds.length === 1 ? selectedKhoaIds : undefined,
    },
    "dashboard",
  );

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
      <h2 className={`mb-4 ${D.sectionHeadingSm}`}>Toàn viện (tóm tắt)</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {brief?.nkbv.available ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Activity size={14} className="text-amber-600" aria-hidden />
                NKBV chờ xử lý
              </p>
              {!nkbvBlocked ? (
                <Link href={nkbvHref} className="text-[11px] font-bold text-[var(--primary)] inline-flex items-center gap-0.5">
                  Thống kê <ExternalLink size={11} aria-hidden />
                </Link>
              ) : null}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {busy && !brief ? "…" : brief.nkbv.choXn ?? "—"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Đang ghi / chờ xác nhận · tổng phiếu kỳ: {brief.nkbv.tongPhieu ?? "—"}
            </p>
          </div>
        ) : null}

        {brief?.cssd.available ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Package size={14} className="text-red-600" aria-hidden />
                CSSD cảnh báo đỏ
              </p>
              <Link
                href={cssdReportAnalyticsHref({ tab: "volume", from: tuNgay, to: denNgay })}
                className="text-[11px] font-bold text-[var(--primary)] inline-flex items-center gap-0.5"
              >
                Báo cáo <ExternalLink size={11} aria-hidden />
              </Link>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
              {busy && !brief ? "…" : brief.cssd.redAlertTotal ?? "—"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
              <Snowflake size={12} aria-hidden />
              Đóng băng: {brief.cssd.frozenTotal ?? "—"} · realtime 6 trạm
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
