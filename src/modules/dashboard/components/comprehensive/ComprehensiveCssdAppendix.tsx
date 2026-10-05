"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, Package } from "lucide-react";
import type { BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { cssdReportAnalyticsHref } from "@/lib/cssd-routes";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

export function ComprehensiveCssdAppendix({ payload }: { payload: BaoCaoTongHopPayload | null }) {
  const href = useMemo(() => {
    if (!payload) return cssdReportAnalyticsHref({ tab: "volume" });
    return cssdReportAnalyticsHref({
      tab: "volume",
      from: payload.filters.tu_ngay,
      to: payload.filters.den_ngay,
    });
  }, [payload]);

  if (!payload || payload.sources.cssd !== "ok" || !payload.cssd) {
    if (payload?.sources.cssd === "denied" || payload?.sources.cssd === "error") {
      return (
        <section className="rounded-[var(--radius-shell)] border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
          Phụ lục CSSD chưa tải được
          {payload.errors.cssd ? ` (${payload.errors.cssd})` : ""}. Không ảnh hưởng chỉ số VST/GSC.
        </section>
      );
    }
    return null;
  }

  return (
    <section className={`${D.shellPadded}`}>
      <div className="flex flex-wrap items-center justify-between gap-[var(--bv103-space-2)]">
        <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
          <Package size={18} className="text-[var(--primary)]" aria-hidden />
          Phụ lục CSSD — số liệu toàn viện
        </h2>
        <Link
          href={href}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 hover:bg-white"
        >
          Báo cáo CSSD
          <ExternalLink size={13} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
