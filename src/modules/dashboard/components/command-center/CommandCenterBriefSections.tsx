"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  ExternalLink,
  Eye,
  FileBarChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { VstStrategicPayload } from "@/modules/giam-sat-vst/types/vst-strategic.types";
import type { GscStrategicPayload } from "@/modules/giam-sat-chung/types/gsc-strategic.types";
import {
  buildGapKhoaRows,
  gapExclusionReason,
  isGapComparable,
  normalizeGapKhoaRow,
  partitionGapKhoaRows,
  type GapKhoaSourceRow,
} from "@/lib/analytics/supervision-matrix-mappers";
import { buildAnalyticsDeepLink } from "@/modules/dashboard/lib/bao-cao-tong-hop-core";
import {
  BAO_CAO_TONG_HOP_THRESHOLDS,
  complianceToneFromPercent,
} from "@/modules/dashboard/lib/bao-cao-tong-hop-thresholds";
import {
  isPathBlockedUnderPilotCoreModules,
  isPilotCoreModulesScopeEnabled,
} from "@/lib/ksnk-pilot-core-modules-scope";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

type Props = {
  vstPayload: VstStrategicPayload | null;
  gscPayload: GscStrategicPayload | null;
  tuNgay: string;
  denNgay: string;
  selectedKhoaIds: string[];
  loading?: boolean;
};

type GapAlertRow = {
  domain: "VST" | "GSC";
  ten: string;
  tyLeTgs: number | null;
  tyLeKsnk: number | null;
  doLech: number;
  summary: string;
};

function formatGapSummary(tyLeTgs: number | null, tyLeKsnk: number | null, doLech: number): string {
  if (tyLeTgs != null && tyLeKsnk != null) {
    if (doLech <= 5) {
      return `TGS ${Math.round(tyLeTgs)}% · KSNK ${Math.round(tyLeKsnk)}% — trong ngưỡng (Δ ${Math.round(doLech)}%)`;
    }
    const higher = tyLeKsnk > tyLeTgs ? "KSNK cao hơn TGS" : "TGS cao hơn KSNK";
    return `TGS ${Math.round(tyLeTgs)}% · KSNK ${Math.round(tyLeKsnk)}% — ${higher} ${Math.round(doLech)} điểm`;
  }
  return `Chênh lệch ${Math.round(doLech)}%`;
}

function collectGapAlerts(
  vstPayload: VstStrategicPayload | null,
  gscPayload: GscStrategicPayload | null,
): GapAlertRow[] {
  const rows = [
    ...(vstPayload?.gap_analysis ?? []).map((r) => ({ domain: "VST" as const, raw: r as GapKhoaSourceRow })),
    ...(gscPayload?.gap_analysis ?? []).map((r) => ({ domain: "GSC" as const, raw: r as GapKhoaSourceRow })),
  ]
    .map(({ domain, raw }) => {
      const norm = normalizeGapKhoaRow(raw);
      if (!isGapComparable(norm)) return null;
      const doLech =
        raw.do_lech != null
          ? Math.abs(raw.do_lech)
          : Math.abs((raw.ty_le_tgs ?? 0) - (raw.ty_le_ksnk ?? 0));
      return {
        domain,
        ten: raw.ten ?? norm.ten,
        tyLeTgs: norm.ty_le_tgs,
        tyLeKsnk: norm.ty_le_ksnk,
        doLech,
        summary: formatGapSummary(norm.ty_le_tgs, norm.ty_le_ksnk, doLech),
      };
    })
    .filter((r): r is GapAlertRow => r != null);

  return rows.sort((a, b) => b.doLech - a.doLech).slice(0, 3);
}

function countExcludedKhoa(vstPayload: VstStrategicPayload | null, gscPayload: GscStrategicPayload | null): number {
  const seen = new Set<string>();
  let count = 0;
  for (const raw of [...(vstPayload?.gap_analysis ?? []), ...(gscPayload?.gap_analysis ?? [])]) {
    const norm = normalizeGapKhoaRow(raw as GapKhoaSourceRow);
    const id = norm.id;
    if (seen.has(id)) continue;
    seen.add(id);
    if (gapExclusionReason(norm)) count += 1;
  }
  return count;
}

export function CommandCenterBriefSections({
  vstPayload,
  gscPayload,
  tuNgay,
  denNgay,
  selectedKhoaIds,
  loading = false,
}: Props) {
  const filterSeed = useMemo(
    () => ({
      tu_ngay: tuNgay,
      den_ngay: denNgay,
      khoa_ids: selectedKhoaIds.length > 0 ? selectedKhoaIds : undefined,
    }),
    [tuNgay, denNgay, selectedKhoaIds],
  );

  const baoCaoHref = buildAnalyticsDeepLink("/bao-cao-tong-hop", filterSeed);
  const thongKeGscHref = buildAnalyticsDeepLink("/giam-sat-chung", filterSeed, "analytics");
  const thongKeGscBkToiHref = buildAnalyticsDeepLink(
    "/giam-sat-chung",
    { ...filterSeed, view: "bk-toi" },
    "analytics",
  );
  const showBaoCao = !(isPilotCoreModulesScopeEnabled() && isPathBlockedUnderPilotCoreModules("/bao-cao-tong-hop"));

  const tyLeVst = vstPayload?.kpis?.ty_le_tuan_thu ?? null;
  const tyLeGsc = gscPayload?.kpis?.ty_le_tuan_thu ?? null;

  const topGapAlerts = useMemo(
    () => collectGapAlerts(vstPayload, gscPayload),
    [vstPayload, gscPayload],
  );

  const excludedKhoaCount = useMemo(
    () => countExcludedKhoa(vstPayload, gscPayload),
    [vstPayload, gscPayload],
  );

  const hasSessionInPeriod = useMemo(() => {
    const vstVol = vstPayload?.kpis?.tong_co_hoi ?? 0;
    const gscVol = gscPayload?.kpis?.tong_phien ?? 0;
    return vstVol + gscVol > 0;
  }, [vstPayload, gscPayload]);

  const gapStatusMessage = useMemo(() => {
    if (loading) return null;
    if (topGapAlerts.length > 0) return null;
    if (!hasSessionInPeriod) {
      return "Chưa có phiên giám sát trong kỳ lọc. Gap chỉ hiển thị khi khoa có đủ dữ liệu TGS và KSNK — cấu hình áp dụng tại Quản trị bảng kiểm.";
    }
    if (excludedKhoaCount > 0) {
      return `${excludedKhoaCount} khoa chưa đủ hai nguồn (TGS và KSNK) để đối soát trong kỳ — xem chi tiết tại Thống kê GSC.`;
    }
    const gscRows = buildGapKhoaRows(gscPayload?.gap_analysis, selectedKhoaIds, [], 0);
    const vstRows = buildGapKhoaRows(vstPayload?.gap_analysis, selectedKhoaIds, [], 0);
    const { comparable } = partitionGapKhoaRows([...gscRows, ...vstRows]);
    if (comparable.length > 0) {
      return "Không phát hiện chênh lệch đáng kể — các khoa đối soát được đang trong ngưỡng.";
    }
    return "Chưa đủ điều kiện tính gap — kiểm tra cấu hình áp dụng bảng kiểm và phiên trong kỳ.";
  }, [
    loading,
    topGapAlerts.length,
    hasSessionInPeriod,
    excludedKhoaCount,
    gscPayload?.gap_analysis,
    vstPayload?.gap_analysis,
    selectedKhoaIds,
  ]);

  return (
    <>
      <section className={`rounded-2xl border p-5 shadow-sm ${D.noticePeriod}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`text-xs font-medium ${D.trafficText.green}`}>Báo cáo kỳ</p>
            <p className="mt-1 text-sm text-slate-600">
              Xu hướng, so sánh khoa và in báo cáo gửi BGĐ/HĐ KSNK — dùng trang báo cáo tổng hợp (không in từ đây).
            </p>
          </div>
          <Link
            href={baoCaoHref}
            className={`${D.ctaPrimary} shrink-0 shadow-md`}
          >
            <FileBarChart size={16} aria-hidden />
            Mở báo cáo tổng hợp
            <ExternalLink size={12} aria-hidden />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <BriefCard icon={Activity} label="Khoa Tự giám sát" value={Math.max(vstPayload?.workload?.khoa_tu_giam_sat ?? 0, gscPayload?.workload?.khoa_tu_giam_sat ?? 0)} suffix="khoa" tone="blue" />
        <BriefCard icon={Eye} label="Được KSNK bao phủ" value={Math.max(vstPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0, gscPayload?.workload?.khoa_duoc_ksnk_giam_sat ?? 0)} suffix="khoa" tone="emerald" />
        <BriefCard icon={ClipboardList} label="Chuyên đề bao phủ" value={gscPayload?.workload?.chuyen_de_duoc_ksnk_phu ?? 0} suffix="BK" tone="purple" />
        <BriefCard icon={Users} label="Phiên KSNK (GSC)" value={gscPayload?.workload?.ksnk_so_phien ?? 0} suffix="phiên" tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrafficLightCard
          title="Vệ sinh tay"
          icon={ShieldCheck}
          percent={tyLeVst}
          detailHref={buildAnalyticsDeepLink("/giam-sat-vst", { tu_ngay: tuNgay, den_ngay: denNgay, khoa_ids: selectedKhoaIds.length ? selectedKhoaIds : undefined }, "analytics")}
        />
        <TrafficLightCard
          title="Giám sát chung"
          icon={ClipboardList}
          percent={tyLeGsc}
          detailHref={buildAnalyticsDeepLink("/giam-sat-chung", {
            tu_ngay: tuNgay,
            den_ngay: denNgay,
            khoa_ids: selectedKhoaIds.length ? selectedKhoaIds : undefined,
          }, "analytics")}
        />
      </div>

      {loading || topGapAlerts.length > 0 || gapStatusMessage ? (
        <section className={`rounded-2xl p-5 ${D.noticeGap}`}>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className={`flex items-center gap-2 ${D.sectionHeadingSm}`}>
                <AlertTriangle size={16} className="text-[var(--surface-warning-text)]" aria-hidden />
                Cảnh báo chênh lệch TGS vs KSNK
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Chỉ tóm tắt khoa đủ hai nguồn trong kỳ — hệ thống không bịa Δ%.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={thongKeGscBkToiHref}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50"
              >
                BK phải TGS
                <ExternalLink size={12} aria-hidden />
              </Link>
              <Link
                href={thongKeGscHref}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50"
              >
                Thống kê GSC
                <ExternalLink size={12} aria-hidden />
              </Link>
              {showBaoCao ? (
                <Link
                  href={baoCaoHref}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50"
                >
                  Báo cáo tổng hợp
                  <ExternalLink size={12} aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Đang đối soát dữ liệu TGS và KSNK trong kỳ…</p>
          ) : topGapAlerts.length > 0 ? (
            <ul className="space-y-2">
              {topGapAlerts.map((row) => (
                <li
                  key={`${row.domain}-${row.ten}`}
                  className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                      {row.domain}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">{row.ten}</span>
                    <p className="mt-0.5 text-xs text-slate-600">{row.summary}</p>
                  </div>
                  <span className="shrink-0 font-bold text-amber-800">Δ {Math.round(row.doLech)}%</span>
                </li>
              ))}
            </ul>
          ) : gapStatusMessage ? (
            <p className="rounded-lg bg-white px-3 py-2.5 text-sm text-slate-600">{gapStatusMessage}</p>
          ) : null}

          {!loading && !hasSessionInPeriod ? (
            <p className="mt-3 text-[11px] text-slate-500">
              Gợi ý: cấu hình{" "}
              <Link href="/quan-tri-he-thong/bang-kiem" className="font-bold text-[var(--primary)] hover:underline">
                áp dụng bảng kiểm
              </Link>{" "}
              trước khi chạy phiên GSC TGS.
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function TrafficLightCard({
  title,
  icon: Icon,
  percent,
  detailHref,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  percent: number | null;
  detailHref: string;
}) {
  const tone = complianceToneFromPercent(percent);
  const toneRing = D.trafficRing[tone];
  const toneText = D.trafficText[tone];

  return (
    <div className={`rounded-2xl border border-slate-200 p-5 shadow-sm ring-2 ${toneRing}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={`flex items-center gap-2 ${D.sectionHeadingSm}`}>
          <Icon size={18} className={toneText} aria-hidden />
          {title}
        </h2>
        <span className={`text-[11px] font-medium ${toneText}`}>
          {tone === "green" ? "Đạt" : tone === "yellow" ? "Cận ngưỡng" : tone === "red" ? "Nguy cơ" : "—"}
        </span>
      </div>
      <p className={`mt-3 ${D.kpiValueLg} ${toneText}`}>{percent != null ? `${percent}%` : "N/A"}</p>
      <p className="mt-1 text-[11px] text-slate-400">
        Ngưỡng xanh ≥{BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}% · vàng ≥{BAO_CAO_TONG_HOP_THRESHOLDS.YELLOW_MIN}%
      </p>
      <Link href={detailHref} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
        Thống kê chuyên sâu <ExternalLink size={12} aria-hidden />
      </Link>
    </div>
  );
}

function BriefCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number;
  suffix: string;
  tone: "blue" | "emerald" | "purple" | "orange";
}) {
  const bg = { blue: "bg-blue-500", emerald: "bg-emerald-500", purple: "bg-purple-500", orange: "bg-orange-500" }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-3 text-white ${bg}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className={D.kpiLabel}>{label}</p>
          <p className={T.statValue}>
            {value} <span className="text-xs font-semibold text-slate-400">{suffix}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export function CommandCenterKsnkStaffSection({
  rows,
  loading,
  onExpand,
}: {
  rows: { id: string; ho_ten: string; ma_nv: string; so_co_hoi_vst: number; so_phien_vst: number; so_phien_gsc: number }[];
  loading: boolean;
  onExpand: () => void;
}) {
  if (rows.length === 0 && !loading) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-6">
        <button
          type="button"
          onClick={onExpand}
          className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
        >
          <Users size={18} /> Tải bảng hoạt động nhân viên KSNK
        </button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-6 py-4">
        <Users className="text-indigo-600" size={20} />
        <div>
          <h3 className="font-bold text-slate-800">Hoạt động Nhân viên KSNK</h3>
          <p className="text-xs text-slate-500">Tải theo yêu cầu — không chặn KPI tóm tắt</p>
        </div>
        {loading ? <span className="text-xs text-slate-400">Đang tải…</span> : null}
      </div>
      {rows.length > 0 ? (
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 text-left">Nhân viên</th>
                <th className="px-4 py-3 text-right">Cơ hội VST</th>
                <th className="px-4 py-3 text-right">Phiên VST</th>
                <th className="px-4 py-3 text-right">Phiên GSC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...rows]
                .sort((a, b) => b.so_phien_vst + b.so_phien_gsc - (a.so_phien_vst + a.so_phien_gsc))
                .map((nv) => (
                  <tr key={nv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-2.5">
                      <p className="font-semibold text-slate-700">{nv.ho_ten}</p>
                      <p className="text-xs text-slate-400">{nv.ma_nv}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right">{nv.so_co_hoi_vst.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{nv.so_phien_vst.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right">{nv.so_phien_gsc.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
          <AlertTriangle size={16} /> Không có dữ liệu hoặc bạn không có quyền xem.
        </div>
      )}
    </section>
  );
}
