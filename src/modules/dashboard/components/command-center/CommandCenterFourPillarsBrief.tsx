"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ClipboardCheck,
  ExternalLink,
  Package,
  Users,
  Wrench,
} from "lucide-react";
import {
  fetchCommandCenterFourPillarsBrief,
  type FourPillarsBrief,
} from "../../actions/dashboard-four-pillars-brief.actions";
import { buildAnalyticsDeepLink } from "../../lib/bao-cao-tong-hop-core";
import { buildFourPillarsNarratives } from "../../lib/four-pillars-narrative";
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
  /** VST/GSC đã có trên brief chính — truyền để hiện Trụ A (không dùng CCS). */
  tyLeVst: number | null;
  tyLeGsc: number | null;
  loading?: boolean;
};

function PillarCard({
  title,
  icon,
  value,
  summary,
  reasons,
  href,
  linkLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  summary: string;
  reasons: string[];
  href: string;
  linkLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          {icon}
          {title}
        </p>
        <div className="flex flex-col items-end gap-0.5">
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[var(--primary)]"
          >
            {linkLabel} <ExternalLink size={11} aria-hidden />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 hover:text-[var(--primary)]"
            >
              {secondaryLabel} <ExternalLink size={10} aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-medium leading-snug text-slate-700">{summary}</p>
      {reasons.length > 0 ? (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Hàng 4 trụ quản trị — số + câu mô tả + ≤3 nguyên nhân + CTA.
 * Trụ A = VST/GSC riêng. Trụ C tách NV KSNK vs máy CSSD.
 */
export function CommandCenterFourPillarsBrief({
  tuNgay,
  denNgay,
  selectedKhoaIds,
  tyLeVst,
  tyLeGsc,
  loading,
}: Props) {
  const [brief, setBrief] = useState<FourPillarsBrief | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setBusy(true);
    void fetchCommandCenterFourPillarsBrief({
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

  const nkbvBlocked =
    isPilotCoreModulesScopeEnabled() && isPathBlockedUnderPilotCoreModules("/giam-sat-nkbv");

  const filterOpts = useMemo(
    () => ({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_ids: selectedKhoaIds.length === 1 ? selectedKhoaIds : undefined,
    }),
    [tuNgay, denNgay, selectedKhoaIds],
  );

  const vstHref = useMemo(
    () => buildAnalyticsDeepLink("/thong-ke/vst", filterOpts, "dashboard"),
    [filterOpts],
  );
  const gscHref = useMemo(
    () => buildAnalyticsDeepLink("/thong-ke/gsc", filterOpts, "dashboard"),
    [filterOpts],
  );
  const cssdHref = useMemo(
    () => cssdReportAnalyticsHref({ tab: "volume", from: tuNgay, to: denNgay }),
    [tuNgay, denNgay],
  );
  const cssdMayHref = useMemo(
    () => cssdReportAnalyticsHref({ tab: "equipment", from: tuNgay, to: denNgay }),
    [tuNgay, denNgay],
  );
  const nkbvHref = useMemo(
    () => buildAnalyticsDeepLink("/giam-sat-nkbv", filterOpts, "dashboard"),
    [filterOpts],
  );

  const narratives = useMemo(
    () =>
      buildFourPillarsNarratives({
        tyLeVst,
        tyLeGsc,
        cssd: brief?.cssd ?? null,
        nkbv: brief?.nkbv ?? null,
        staff: brief?.staff ?? null,
        nkbvBlocked,
      }),
    [tyLeVst, tyLeGsc, brief, nkbvBlocked],
  );

  const pillarAValue =
    busy && !brief
      ? "…"
      : tyLeVst == null && tyLeGsc == null
        ? "—"
        : [tyLeVst != null ? `VST ${tyLeVst}%` : null, tyLeGsc != null ? `GSC ${tyLeGsc}%` : null]
            .filter(Boolean)
            .join(" · ");

  if (!brief && !busy) return null;

  const cssd = brief?.cssd;
  const nkbv = brief?.nkbv;
  const staff = brief?.staff;

  const pillarCValue =
    busy && !brief
      ? "…"
      : staff?.available
        ? (staff.tong_phien_gs ?? 0).toLocaleString()
        : cssd?.available
          ? `${cssd.may_ready ?? 0} máy`
          : "—";

  return (
    <section className="rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4">
      <h2 className={`mb-4 ${D.sectionHeadingSm}`}>Bốn trụ quản trị</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PillarCard
          title="A · Tuân thủ"
          icon={<ClipboardCheck size={14} className="text-emerald-600" aria-hidden />}
          value={pillarAValue}
          summary={narratives.a.summary}
          reasons={narratives.a.reasons}
          href={vstHref}
          linkLabel="Thống kê VST"
          secondaryHref={gscHref}
          secondaryLabel="Thống kê GSC"
        />
        <PillarCard
          title="B · CSSD"
          icon={<Package size={14} className="text-red-600" aria-hidden />}
          value={
            busy && !brief
              ? "…"
              : cssd?.available
                ? (cssd.san_luong_cap_phat ?? 0).toLocaleString()
                : "—"
          }
          summary={narratives.b.summary}
          reasons={narratives.b.reasons}
          href={cssdHref}
          linkLabel="Báo cáo CSSD"
        />
        <PillarCard
          title="C · Nguồn lực"
          icon={<Users size={14} className="text-indigo-600" aria-hidden />}
          value={pillarCValue}
          summary={`${narratives.cKsnk.summary} ${narratives.cMay.summary}`}
          reasons={[...narratives.cKsnk.reasons, ...narratives.cMay.reasons].slice(0, 3)}
          href="#ksnk-staff-workload"
          linkLabel="NV KSNK"
          secondaryHref={cssdMayHref}
          secondaryLabel="Máy / NV CSSD"
        />
        <PillarCard
          title="D · Kết cục"
          icon={
            nkbvBlocked ? (
              <Wrench size={14} className="text-slate-400" aria-hidden />
            ) : (
              <Activity size={14} className="text-amber-600" aria-hidden />
            )
          }
          value={
            busy && !brief
              ? "…"
              : nkbv?.available
                ? (nkbv.choXn ?? 0).toLocaleString()
                : "—"
          }
          summary={narratives.d.summary}
          reasons={narratives.d.reasons}
          href={nkbvBlocked ? "/bao-cao-tong-hop" : nkbvHref}
          linkLabel={nkbvBlocked ? "Báo cáo tổng hợp" : "NKBV"}
          secondaryHref="/quan-ly-cong-viec?from=analytics&topic=K%E1%BA%BFt%20c%E1%BB%A5c%20KSNK&gap=Theo%20d%C3%B5i%20c%E1%BA%A3i%20ti%E1%BA%BFn&create=1&chi_so=nkbv_cho_xn"
          secondaryLabel="QLCV"
        />
      </div>
    </section>
  );
}
