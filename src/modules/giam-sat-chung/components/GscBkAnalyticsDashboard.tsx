"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { groupCriterionKhoaRows, sortCriterionMatrix } from "@/lib/analytics/gsc-checklist-analytics";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import { complianceToneFromPercent } from "@/lib/analytics/supervision-thresholds";
import type { GscChecklistDetailPayload, GscChecklistCriterionKhoaRow, GscCriterionMatrixRow } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";

type Props = {
  maBk: string;
  label: string;
  detail: GscChecklistDetailPayload | null;
  loading?: boolean;
  error?: string | null;
  khoaOptions: { id: string; label: string }[];
  selectedKhoaIds: string[];
  onClose: () => void;
};

function criterionToneClass(tyLe: number | null): string {
  if (tyLe == null) return "text-slate-600";
  const tone = complianceToneFromPercent(tyLe);
  if (tone === "green") return "text-emerald-700";
  if (tone === "yellow") return "text-amber-700";
  if (tone === "red") return "text-red-700";
  return "text-slate-800";
}

export function GscBkAnalyticsDashboard({
  maBk,
  label,
  detail,
  loading,
  error,
  khoaOptions,
  selectedKhoaIds,
  onClose,
}: Props) {
  const [expandedCriterionId, setExpandedCriterionId] = useState<string | null>(null);

  const gapKhoaRows = useMemo(
    () => buildGapKhoaRows(detail?.gap_analysis, selectedKhoaIds, khoaOptions, khoaOptions.length),
    [detail?.gap_analysis, selectedKhoaIds, khoaOptions],
  );

  const criteria = useMemo(
    () => sortCriterionMatrix(detail?.matrix_criterion ?? []),
    [detail?.matrix_criterion],
  );

  const khoaByCriterion = useMemo(
    () => groupCriterionKhoaRows(detail?.criterion_khoa ?? []),
    [detail?.criterion_khoa],
  );

  const compareSections = useMemo(
    () => [
      { title: "Theo khối", rows: toCompareRows(detail?.matrix_khoi) },
      { title: "Theo chức năng phòng", rows: toCompareRows(detail?.matrix_khu_vuc) },
      { title: "Theo đối tượng", rows: toCompareRows(detail?.matrix_nghe) },
      { title: "Theo hình thức giám sát", rows: toCompareRows(detail?.matrix_hinh_thuc) },
      { title: "Theo cách thức giám sát", rows: toCompareRows(detail?.matrix_cach_thuc) },
    ],
    [detail],
  );

  const toggleCriterion = (id: string) => {
    setExpandedCriterionId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`${UI.shell} border-sky-200 ring-1 ring-sky-100`}>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Dashboard bảng kiểm</p>
          <h3 className="text-base font-bold text-slate-900">
            {maBk} · {label}
          </h3>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          onClick={onClose}
          aria-label="Đóng dashboard"
        >
          <X size={16} /> Đóng
        </button>
      </div>

      {error ? (
        <div className="mx-4 my-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="space-y-4 p-4">
        <SupervisionKpiRow
          loading={loading}
          items={[
            { label: "Phiên giám sát", value: detail?.kpis?.tong_phien ?? 0 },
            { label: "Tiêu chí áp dụng", value: detail?.kpis?.tong_quan_sat ?? 0 },
            { label: "Vi phạm", value: detail?.kpis?.tong_vi_pham ?? 0 },
            { label: "Tỷ lệ tuân thủ", value: formatPercent2(detail?.kpis?.ty_le_tuan_thu ?? 0) },
          ]}
        />

        <SupervisionTrendChart
          title="Xu hướng tuân thủ"
          data={detail?.trendline ?? []}
          loading={loading}
          source="gsc"
        />

        <SupervisionKhoaAnalyticsBlock
          rows={gapKhoaRows}
          loading={loading}
          moduleLabel="GSC"
          tgsVolumeLabel="Khảo sát TGS"
          ksnkVolumeLabel="Khảo sát KSNK"
        />

        <GscCriterionTable
          criteria={criteria}
          khoaByCriterion={khoaByCriterion}
          expandedCriterionId={expandedCriterionId}
          onToggle={toggleCriterion}
          loading={loading}
        />

        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
            Ma trận phân tích (chức năng phòng, đối tượng, hình thức…)
            <span className="mt-0.5 block text-[11px] font-normal text-slate-400">Mở để xem chi tiết</span>
          </summary>
          <div className="border-t border-slate-100 px-4 pb-4 pt-2">
            <SupervisionCompareAccordion sections={compareSections} loading={loading} />
          </div>
        </details>
      </div>
    </div>
  );
}

function GscCriterionTable({
  criteria,
  khoaByCriterion,
  expandedCriterionId,
  onToggle,
  loading,
}: {
  criteria: GscCriterionMatrixRow[];
  khoaByCriterion: Map<string, GscChecklistCriterionKhoaRow[]>;
  expandedCriterionId: string | null;
  onToggle: (id: string) => void;
  loading?: boolean;
}) {
  if (!loading && criteria.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-1 text-sm font-bold text-slate-800">Tiêu chí trong bảng kiểm</h3>
      <p className="mb-3 text-[11px] text-slate-500">
        Sắp xếp tiêu chí yếu trước. Nhấn dòng để xem vi phạm theo từng khoa.
      </p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="w-8 px-2 py-2" />
              <th className="px-3 py-2 text-left">Tiêu chí</th>
              <th className="px-3 py-2 text-right">Quan sát</th>
              <th className="px-3 py-2 text-right">Vi phạm</th>
              <th className="px-3 py-2 text-right">Tuân thủ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              criteria.map((c) => {
                const expanded = expandedCriterionId === c.criterion_id;
                const khoaRows = khoaByCriterion.get(c.criterion_id) ?? [];
                return (
                  <React.Fragment key={c.criterion_id}>
                    <tr
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      onClick={() => onToggle(c.criterion_id)}
                    >
                      <td className="px-2 py-2 text-slate-400">
                        {khoaRows.length > 0 ? (
                          expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-left text-xs font-medium text-slate-800">
                        {c.stt != null ? `${c.stt}. ` : ""}
                        {c.ten_tieu_chi}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{c.tong_quan_sat}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-red-700">{c.tong_vi_pham}</td>
                      <td
                        className={`px-3 py-2 text-right font-bold tabular-nums ${criterionToneClass(c.ty_le_tuan_thu)}`}
                      >
                        {c.ty_le_tuan_thu != null ? formatPercent2(c.ty_le_tuan_thu) : "—"}
                      </td>
                    </tr>
                    {expanded && khoaRows.length > 0 ? (
                      <tr className="bg-slate-50/80">
                        <td colSpan={5} className="px-3 py-2">
                          <div className="ml-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full min-w-[400px] text-xs">
                              <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                                  <th className="px-3 py-1.5 text-left">Khoa</th>
                                  <th className="px-2 py-1.5 text-right">Quan sát</th>
                                  <th className="px-2 py-1.5 text-right">Vi phạm</th>
                                  <th className="px-2 py-1.5 text-right">Tỷ lệ VP</th>
                                </tr>
                              </thead>
                              <tbody>
                                {khoaRows.map((k) => (
                                  <tr key={k.khoa_id} className="border-b border-slate-50 last:border-0">
                                    <td className="px-3 py-1.5 font-medium text-slate-700">{k.ten}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{k.tong_quan_sat}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums text-red-700">{k.tong_vi_pham}</td>
                                    <td className="px-2 py-1.5 text-right font-bold tabular-nums text-red-700">
                                      {formatPercent2(k.ty_le_vi_pham)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
