"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import {
  resolveAllSortedChecklistOverview,
  resolveSortedChecklistOverview,
  resolveThinChecklistOverview,
} from "@/lib/analytics/gsc-checklist-intervention";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import { gscTyLeFromMatrixCounts } from "@/lib/analytics/supervision-matrix-mappers";
import { complianceToneFromPercent } from "@/lib/analytics/supervision-thresholds";
import type { GscChecklistOverviewRow, GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";

type Props = {
  payload: GscStrategicPayload | null;
  loading?: boolean;
  selectedMaBk: string | null;
  onSelectMaBk: (ma: string | null) => void;
  bkLabelRecord?: Record<string, string>;
  /** Mặc định 5 bảng kiểm cần chú ý (đủ min-N). */
  limit?: number;
};

function complianceClass(tyLe: number | null | undefined): string {
  if (tyLe == null) return "text-slate-500";
  const tone = complianceToneFromPercent(tyLe);
  if (tone === "green") return "text-emerald-700";
  if (tone === "yellow") return "text-amber-700";
  if (tone === "red") return "text-red-700";
  return "text-slate-800";
}

function formatTyLe(row: GscChecklistOverviewRow): string {
  if (Number(row.tong_quan_sat ?? 0) <= 0) return "—";
  const pct = gscTyLeFromMatrixCounts(row);
  if (pct == null && row.ty_le_tuan_thu == null) return "—";
  return formatPercent2(pct ?? row.ty_le_tuan_thu);
}

export function GscChecklistNavigator({
  payload,
  loading,
  selectedMaBk,
  onSelectMaBk,
  bkLabelRecord,
  limit = 5,
}: Props) {
  const [showAll, setShowAll] = useState(limit <= 0);
  const effectiveLimit = showAll || limit <= 0 ? 0 : limit;
  const thinRows = useMemo(() => resolveThinChecklistOverview(payload), [payload]);
  const rows = useMemo(() => {
    const list = showAll
      ? resolveAllSortedChecklistOverview(payload)
      : resolveSortedChecklistOverview(payload);
    const sliced = effectiveLimit > 0 ? list.slice(0, effectiveLimit) : list;
    return sliced.map((r) => ({
      ...r,
      label: bkLabelRecord?.[r.ma_bk] ?? r.ten_bang_kiem ?? r.ma_bk,
    }));
  }, [payload, bkLabelRecord, effectiveLimit, showAll]);
  const hiddenCount = useMemo(() => {
    if (showAll || effectiveLimit <= 0) return 0;
    const total = resolveSortedChecklistOverview(payload).length;
    return Math.max(0, total - effectiveLimit);
  }, [payload, effectiveLimit, showAll]);

  if (!loading && rows.length === 0 && thinRows.length === 0) {
    return (
      <div className={`${UI.inset} p-4 text-sm text-slate-500`}>
        Chưa có phiên giám sát theo bảng kiểm trong kỳ lọc.
      </div>
    );
  }

  return (
    <div className={`${UI.shell} max-sm:overflow-visible sm:overflow-hidden`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="bv103-type-section text-slate-800">Bảng kiểm cần chú ý</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {effectiveLimit > 0
            ? `Năm bảng kiểm tuân thủ thấp / vi phạm nhiều (đủ mẫu)${hiddenCount > 0 ? ` — còn ${hiddenCount}` : ""}.`
            : "Sắp xếp theo rủi ro. Chọn một dòng để xem lỗi theo khoa và tiêu chí."}
        </p>
        {hiddenCount > 0 || thinRows.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
          >
            Xem mọi bảng kiểm
          </button>
        ) : null}
      </div>
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(52dvh,480px)]">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 bv103-type-label font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Bảng kiểm</th>
              <th className="px-2 py-2 text-right">Phiên</th>
              <th className="px-2 py-2 text-right">Tiêu chí áp dụng</th>
              <th className="px-2 py-2 text-right">Vi phạm</th>
              <th className="px-2 py-2 text-right">Tuân thủ</th>
              <th className="px-2 py-2">Lỗi nổi bật</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Đang tải…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <ChecklistRow
                  key={r.ma_bk}
                  row={r}
                  label={r.label}
                  active={selectedMaBk === r.ma_bk}
                  onSelect={() => onSelectMaBk(selectedMaBk === r.ma_bk ? null : r.ma_bk)}
                />
              ))
            )}
          </tbody>
        </table>
      </ResponsiveTableShell>
      {!loading && thinRows.length > 0 ? (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="bv103-type-label font-semibold uppercase tracking-wide text-slate-500">
            Mẫu mỏng ({thinRows.length})
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Chưa đủ mẫu để so sánh (cần ≥30 tiêu chí áp dụng và ≥3 phiên). Không xếp hạng.
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-slate-600">
            {thinRows.slice(0, showAll ? 50 : 8).map((r) => (
              <li key={r.ma_bk}>
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => onSelectMaBk(r.ma_bk)}
                >
                  <span className="font-medium text-slate-800">
                    {bkLabelRecord?.[r.ma_bk] ?? r.ten_bang_kiem ?? r.ma_bk}
                  </span>
                  <span className="text-slate-400"> · {r.ma_bk}</span>
                  <span className="tabular-nums text-slate-500">
                    {" "}
                    ({r.tong_phien ?? 0} phiên · {r.tong_quan_sat ?? 0} tiêu chí)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChecklistRow({
  row,
  label,
  active,
  onSelect,
}: {
  row: GscChecklistOverviewRow;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  const ty = Number(row.tong_quan_sat ?? 0) > 0 ? (gscTyLeFromMatrixCounts(row) ?? row.ty_le_tuan_thu) : null;
  return (
    <tr
      className={`cursor-pointer border-b border-slate-100 transition-colors ${
        active ? "bg-sky-50/80" : "hover:bg-slate-50"
      }`}
      onClick={onSelect}
    >
      <td className="px-3 py-2">
        <p className="font-semibold text-slate-800" title={label}>
          {label}
        </p>
        <p className="max-w-[220px] truncate text-[11px] text-slate-500" title={row.ma_bk}>
          {row.ma_bk}
        </p>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{row.tong_phien}</td>
      <td className="px-2 py-2 text-right tabular-nums">{row.tong_quan_sat ?? 0}</td>
      <td className="px-2 py-2 text-right tabular-nums font-medium text-red-700">{row.tong_vi_pham}</td>
      <td className={`px-2 py-2 text-right tabular-nums font-bold ${complianceClass(ty)}`}>
        {formatTyLe(row)}
      </td>
      <td className="px-2 py-2 text-[11px] text-slate-600">
        {row.top_violation_ten ? (
          <span className="inline-flex items-start gap-1">
            <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600" />
            <span>
              {row.top_violation_ten}
              {row.top_violation_so != null ? ` (${row.top_violation_so}×)` : ""}
            </span>
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
