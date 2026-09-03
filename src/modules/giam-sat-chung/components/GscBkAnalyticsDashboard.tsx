"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import {
  SupervisionCompareAccordion,
  SupervisionKhoaAnalyticsBlock,
  SupervisionKpiRow,
  SupervisionTrendChart,
} from "@/lib/analytics/supervision-analytics-charts";
import { groupCriterionKhoaRows, sortCriterionMatrix } from "@/lib/analytics/gsc-checklist-analytics";
import { buildGapKhoaRows, toCompareRows } from "@/lib/analytics/supervision-matrix-mappers";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import { SUPERVISION_SOURCE_UI } from "@/lib/analytics/supervision-source-labels";
import { complianceToneFromPercent } from "@/lib/analytics/supervision-thresholds";
import type { GscChecklistDetailPayload, GscChecklistCriterionKhoaRow, GscCriterionMatrixRow } from "../types/gsc-strategic.types";

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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <h3 className="text-sm font-semibold text-slate-800">
          {maBk} · {label}
        </h3>
        <button
          type="button"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
          onClick={onClose}
          aria-label="Đóng dashboard"
        >
          <X size={14} className="mr-1 inline" /> Đóng
        </button>
      </div>

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}

      <div className="space-y-3">
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
          matrixKhoaRows={detail?.matrix_khoa}
          loading={loading}
          moduleLabel="GSC"
          tgsVolumeLabel={SUPERVISION_SOURCE_UI.gscTgsVol}
          ksnkVolumeLabel={SUPERVISION_SOURCE_UI.gscKsnkVol}
        />

        <GscCriterionTable
          criteria={criteria}
          khoaByCriterion={khoaByCriterion}
          expandedCriterionId={expandedCriterionId}
          onToggle={toggleCriterion}
          loading={loading}
        />

        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 bv103-type-section text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
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

  const selected = criteria.find((c) => c.criterion_id === expandedCriterionId) ?? null;
  const khoaRows = selected ? (khoaByCriterion.get(selected.criterion_id) ?? []) : [];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-800">Tiêu chí trong bảng kiểm</h3>
      <p className="text-[11px] text-slate-500">
        Tiêu chí yếu trước. Bấm một dòng để xem số theo khoa bên phải.
      </p>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ResponsiveTableShell maxHeight="max-h-[min(360px,50dvh)]">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                <th className="px-2.5 py-1.5 text-left">Tiêu chí</th>
                <th className="px-2.5 py-1.5 text-right">Quan sát</th>
                <th className="px-2.5 py-1.5 text-right">Vi phạm</th>
                <th className="px-2.5 py-1.5 text-right">Tuân thủ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-2.5 py-6 text-center text-slate-400">
                    Đang tải…
                  </td>
                </tr>
              ) : (
                criteria.map((c) => {
                  const active = expandedCriterionId === c.criterion_id;
                  return (
                    <tr
                      key={c.criterion_id}
                      className={`cursor-pointer border-b border-slate-100 hover:bg-slate-50 ${active ? "bg-[var(--primary)]/8" : ""}`}
                      onClick={() => onToggle(c.criterion_id)}
                    >
                      <td className="px-2.5 py-1.5 text-left text-xs font-medium text-slate-800">
                        {c.stt != null ? `${c.stt}. ` : ""}
                        {c.ten_tieu_chi}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-700">{c.tong_quan_sat}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums font-medium text-red-700">{c.tong_vi_pham}</td>
                      <td className={`px-2.5 py-1.5 text-right font-semibold tabular-nums ${criterionToneClass(c.ty_le_tuan_thu)}`}>
                        {c.ty_le_tuan_thu != null ? formatPercent2(c.ty_le_tuan_thu) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveTableShell>
        {khoaRows.length > 0 ? (
          <ResponsiveTableShell maxHeight="max-h-[min(360px,50dvh)]">
            <table className="w-full min-w-[320px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-500">
                  <th className="px-2.5 py-1.5 text-left">
                    Khoa{selected ? ` · ${selected.ten_tieu_chi}` : ""}
                  </th>
                  <th className="px-2.5 py-1.5 text-right">Quan sát</th>
                  <th className="px-2.5 py-1.5 text-right">Vi phạm</th>
                  <th className="px-2.5 py-1.5 text-right">Tỷ lệ VP</th>
                </tr>
              </thead>
              <tbody>
                {khoaRows.map((k) => (
                  <tr key={k.khoa_id} className="border-b border-slate-100">
                    <td className="px-2.5 py-1.5 font-medium text-slate-700">{k.ten}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{k.tong_quan_sat}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-red-700">{k.tong_vi_pham}</td>
                    <td className="px-2.5 py-1.5 text-right font-semibold tabular-nums text-red-700">
                      {formatPercent2(k.ty_le_vi_pham)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTableShell>
        ) : (
          <p className="self-center text-[11px] text-slate-400">
            {selected ? "Không có số theo khoa cho tiêu chí này." : "Bấm một tiêu chí để xem khoa."}
          </p>
        )}
      </div>
    </div>
  );
}
