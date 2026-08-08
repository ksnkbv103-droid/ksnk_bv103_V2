"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Activity, ExternalLink } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { SupervisionResponsiveChart } from "@/lib/analytics/supervision-charts-shared";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import {
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";

export function ComprehensiveNkbvOutcome({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const monthly = payload?.nkbv?.monthly ?? [];
  const nkbvHref = useMemo(() => {
    if (!payload) return "/giam-sat-nkbv?tab=dashboard";
    const khoaIds = payload.filters.khoa_ids;
    return buildAnalyticsDeepLink(
      "/giam-sat-nkbv",
      {
        tu_ngay: payload.filters.tu_ngay,
        den_ngay: payload.filters.den_ngay,
        // NKBV tab chỉ lọc 1 khoa — multi-khoa giữ «tất cả»
        khoa_ids: khoaIds?.length === 1 ? khoaIds : undefined,
      },
      "dashboard",
    );
  }, [payload]);

  if (!payload || payload.sources.nkbv !== "ok" || monthly.length === 0) return null;

  const blocked =
    isPilotCoreModulesScopeEnabled() && isPathBlockedUnderPilotCoreModules("/giam-sat-nkbv");

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
          <Activity size={18} className="text-[var(--primary)]" aria-hidden />
          Xu hướng NKBV (outcome)
        </h2>
        {!blocked ? (
          <Link
            href={nkbvHref}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-white"
          >
            Xem thống kê NKBV
            <ExternalLink size={13} aria-hidden />
          </Link>
        ) : null}
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Số phiếu theo tháng — tách khỏi biểu đồ tuân thủ VST/GSC. Link giữ kỳ lọc báo cáo.
      </p>
      <div className="h-[240px] min-w-0">
        <SupervisionResponsiveChart className="h-full w-full min-w-0">
          <BarChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="so_phieu" name="Số phiếu" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </SupervisionResponsiveChart>
      </div>
    </section>
  );
}
