"use client";

import React, { useMemo } from "react";
import { BarChart2, MapPin } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MultiSelectOption } from "@/components/shared/SearchableMultiSelect";
import {
  SupervisionKhoaAnalyticsBlock,
  SupervisionTgsObligationBlock,
} from "@/lib/analytics/supervision-analytics-charts";
import { useGscTgsObligation } from "@/lib/analytics/use-gsc-tgs-obligation";
import { buildGapKhoaRows, type CoverageTopicInput } from "@/lib/analytics/supervision-matrix-mappers";
import type { BaoCaoKhoaRankRow, BaoCaoTongHopPayload } from "../../types/bao-cao-tong-hop.types";
import { mergeKhoaRankWithSelected } from "../../lib/bao-cao-tong-hop-core";
import {
  BAO_CAO_TONG_HOP_THRESHOLDS,
  complianceToneFromPercent,
  type ComplianceTone,
} from "../../lib/bao-cao-tong-hop-thresholds";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type ComprehensiveCompareProps = {
  payload: BaoCaoTongHopPayload | null;
  selectedKhoaIds: string[];
  khoaOptions: MultiSelectOption[];
};

function CompareBarChart({
  data,
  categoryKey,
  vstKey,
  gscKey,
  height,
}: {
  data: Record<string, string | number | null>[];
  categoryKey: string;
  vstKey: string;
  gscKey: string;
  height: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey={categoryKey} width={140} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Legend />
        <Bar dataKey={vstKey} name="VST (%)" fill="#10b981" maxBarSize={16} />
        <Bar dataKey={gscKey} name="GSC (%)" fill="#38bdf8" maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v}%`;
}

function fmtSample(row: BaoCaoKhoaRankRow): string {
  const parts: string[] = [];
  if (row.tong_co_hoi_vst > 0) parts.push(`${row.tong_co_hoi_vst} CH`);
  if (row.tong_quan_sat_gsc > 0) parts.push(`${row.tong_quan_sat_gsc} QS`);
  return parts.length ? parts.join(" · ") : "—";
}

function khoaGroupLabel(row: BaoCaoKhoaRankRow): { label: string; tone: ComplianceTone } {
  if (row.has_data === false || row.tong_co_hoi_vst + row.tong_quan_sat_gsc === 0) {
    return { label: "Chưa GS", tone: "neutral" };
  }
  const tone = complianceToneFromPercent(row.ty_le_ccs);
  if (tone === "green") return { label: "Nhóm cao", tone };
  if (tone === "yellow") return { label: "Trung bình", tone };
  return { label: "Ưu tiên", tone: "red" };
}

function rowToneClass(row: BaoCaoKhoaRankRow): string {
  if (row.has_data === false || row.tong_co_hoi_vst + row.tong_quan_sat_gsc === 0) {
    return "bg-slate-50";
  }
  const tone = complianceToneFromPercent(row.ty_le_ccs);
  if (tone === "green") return "bg-[var(--surface-success-bg)]/40";
  if (tone === "yellow") return "bg-[var(--surface-warning-bg)]/40";
  if (tone === "red") return "bg-[var(--surface-danger-bg)]/40";
  return "";
}

function KhoaRankTable({ rows }: { rows: BaoCaoKhoaRankRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có khoa trong phạm vi lọc.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className={`border-b border-slate-200 bg-slate-50 ${D.tableHeader}`}>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Khoa/phòng</th>
            <th className="px-3 py-2 text-center">VST</th>
            <th className="px-3 py-2 text-center">GSC</th>
            <th className="px-3 py-2 text-center">CCS</th>
            <th className="px-3 py-2 text-center">Mẫu số</th>
            <th className="px-3 py-2 text-center">Nhóm</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const group = khoaGroupLabel(row);
            const ccsTone = complianceToneFromPercent(row.ty_le_ccs);
            return (
              <tr key={row.id} className={`border-b border-slate-100 ${rowToneClass(row)}`}>
                <td className={`px-3 py-2 ${D.cellIndex}`}>{index + 1}</td>
                <td className={`px-3 py-2 ${D.cellTitle}`}>{row.ten}</td>
                <td className={`px-3 py-2 text-center tabular-nums ${D.cellBody}`}>{fmtPct(row.ty_le_vst)}</td>
                <td className={`px-3 py-2 text-center tabular-nums ${D.cellBody}`}>{fmtPct(row.ty_le_gsc)}</td>
                <td className={`px-3 py-2 text-center font-semibold tabular-nums ${D.trafficText[ccsTone]}`}>
                  {row.has_data === false ? "Chưa GS" : fmtPct(row.ty_le_ccs)}
                </td>
                <td className={`px-3 py-2 text-center text-xs tabular-nums text-slate-600 ${D.cellMeta}`}>
                  {fmtSample(row)}
                </td>
                <td className={`px-3 py-2 text-center text-xs font-medium ${D.trafficText[group.tone]}`}>
                  {group.label}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ComprehensiveCompare({ payload, selectedKhoaIds, khoaOptions }: ComprehensiveCompareProps) {
  const filters = payload?.filters;
  const tgsObligation = useGscTgsObligation({
    enabled: payload?.sources.gsc === "ok" && Boolean(filters?.tu_ngay),
    tuNgay: filters?.tu_ngay ?? "",
    denNgay: filters?.den_ngay ?? "",
    selectedKhoiIds: filters?.khoi_ids ?? [],
    selectedKhoaIds: selectedKhoaIds,
  });

  const fullRank = useMemo(
    () =>
      mergeKhoaRankWithSelected(
        payload?.khoa_rank ?? [],
        selectedKhoaIds,
        khoaOptions,
        khoaOptions.length,
      ),
    [payload?.khoa_rank, selectedKhoaIds, khoaOptions],
  );

  const vstGapRows = useMemo(
    () =>
      buildGapKhoaRows(payload?.vst?.gap_analysis, selectedKhoaIds, khoaOptions, khoaOptions.length),
    [payload?.vst?.gap_analysis, selectedKhoaIds, khoaOptions],
  );

  const gscGapRows = useMemo(
    () =>
      buildGapKhoaRows(payload?.gsc?.gap_analysis, selectedKhoaIds, khoaOptions, khoaOptions.length),
    [payload?.gsc?.gap_analysis, selectedKhoaIds, khoaOptions],
  );

  const vstCoverageTopics = useMemo(
    (): CoverageTopicInput[] => [{ id: "vst", label: "VST", rows: vstGapRows }],
    [vstGapRows],
  );

  const gscCoverageTopics = useMemo((): CoverageTopicInput[] => {
    const bks = payload?.gsc?.dynamic_checklists ?? [];
    if (bks.length === 0) return [];
    return [{ id: "gsc-all", label: "GSC (tổng kỳ)", rows: gscGapRows }];
  }, [gscGapRows, payload?.gsc?.dynamic_checklists]);

  const zoneChartData = useMemo(
    () =>
      (payload?.ipac_zone_compare ?? []).filter((r) => r.ty_le_vst != null || r.ty_le_gsc != null),
    [payload?.ipac_zone_compare],
  );

  const hasKhoa = payload?.capabilities.compare_khoa && (fullRank.length > 0 || vstGapRows.length > 0 || gscGapRows.length > 0);
  const hasZone = payload?.capabilities.compare_khu_vuc && zoneChartData.length > 0;
  const hasVstGap = payload?.sources.vst === "ok";
  const hasGscGap = payload?.sources.gsc === "ok";

  if (!hasKhoa && !hasZone) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
        So sánh theo khoa / vùng IPAC: chưa có dữ liệu trong phạm vi lọc hoặc thiếu quyền VST/GSC.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {hasZone ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className={`mb-4 flex items-center gap-2 ${D.sectionHeading}`}>
            <MapPin size={18} className="text-[var(--surface-warning-text)]" aria-hidden />
            So sánh theo vùng IPAC (4 màu)
          </h2>
          <CompareBarChart
            data={zoneChartData}
            categoryKey="ten"
            vstKey="ty_le_vst"
            gscKey="ty_le_gsc"
            height={240}
          />
          <p className="mt-2 text-[11px] text-slate-400">
            Gộp theo nhóm màu khu vực (Trắng / Đỏ / Vàng / Xanh) — chi tiết từng chức năng phòng ở bảng in.
          </p>
        </section>
      ) : null}

      {hasKhoa ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
              <BarChart2 size={18} className="text-indigo-500" aria-hidden />
              So sánh theo khoa ({fullRank.length} khoa)
            </h2>
            <p className="text-[11px] text-slate-500">
              Biểu đồ cột dọc (khớp tab Thống kê) · Bảng xếp hạng CCS (50% VST + 50% GSC) · Ngưỡng ≥
              {BAO_CAO_TONG_HOP_THRESHOLDS.GREEN_MIN}%
            </p>
          </div>

          {hasVstGap ? (
            <div className="mb-6">
              <SupervisionKhoaAnalyticsBlock
                rows={vstGapRows}
                moduleLabel="VST"
                tgsVolumeLabel="Cơ hội TGS (VST)"
                ksnkVolumeLabel="Cơ hội KSNK (VST)"
                coverageTopics={vstCoverageTopics}
              />
            </div>
          ) : null}

          {hasGscGap ? (
            <div className="mb-6 space-y-6">
              <SupervisionTgsObligationBlock
                catalog={tgsObligation.data?.catalog ?? []}
                hits={tgsObligation.data?.hits ?? []}
                khoaOptions={khoaOptions}
                gapRows={gscGapRows}
                loading={tgsObligation.loading}
              />
              <SupervisionKhoaAnalyticsBlock
                rows={gscGapRows}
                moduleLabel="GSC"
                tgsVolumeLabel="Khảo sát TGS (GSC)"
                ksnkVolumeLabel="Khảo sát KSNK (GSC)"
                coverageTopics={gscCoverageTopics.length > 0 ? gscCoverageTopics : undefined}
              />
            </div>
          ) : null}

          <KhoaRankTable rows={fullRank} />
        </section>
      ) : null}
    </div>
  );
}
