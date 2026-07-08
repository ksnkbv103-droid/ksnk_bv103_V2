"use client";

import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import ResponsiveTableShell from "@/components/shared/ResponsiveTableShell";
import { resolveSortedChecklistOverview } from "@/lib/analytics/gsc-checklist-intervention";
import { formatPercent2 } from "@/lib/analytics/supervision-percent";
import { complianceToneFromPercent } from "@/lib/analytics/supervision-thresholds";
import type { GscChecklistOverviewRow, GscStrategicPayload } from "../types/gsc-strategic.types";
import { gscFormChrome as UI } from "../lib/gsc-form-chrome";

type Props = {
  payload: GscStrategicPayload | null;
  loading?: boolean;
  selectedMaBk: string | null;
  onSelectMaBk: (ma: string | null) => void;
  bkLabelRecord?: Record<string, string>;
};

function complianceClass(tyLe: number): string {
  const tone = complianceToneFromPercent(tyLe);
  if (tone === "green") return "text-emerald-700";
  if (tone === "yellow") return "text-amber-700";
  if (tone === "red") return "text-red-700";
  return "text-slate-800";
}

export function GscChecklistNavigator({ payload, loading, selectedMaBk, onSelectMaBk, bkLabelRecord }: Props) {
  const rows = useMemo(() => {
    const list = resolveSortedChecklistOverview(payload);
    return list.map((r) => ({
      ...r,
      label: bkLabelRecord?.[r.ma_bk] ?? r.ten_bang_kiem ?? r.ma_bk,
    }));
  }, [payload, bkLabelRecord]);

  if (!loading && rows.length === 0) {
    return (
      <div className={`${UI.inset} p-4 text-sm text-slate-500`}>
        Chưa có phiên giám sát theo bảng kiểm trong kỳ lọc.
      </div>
    );
  }

  return (
    <div className={`${UI.shell} max-sm:overflow-visible sm:overflow-hidden`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-800">Bảng kiểm — trục phân tích chính</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Sắp xếp theo rủi ro (tuân thủ thấp · vi phạm nhiều). Chọn một dòng để xem lỗi chi tiết theo khoa và tiêu chí.
        </p>
      </div>
      <ResponsiveTableShell unboxed maxHeight="max-h-[min(52dvh,480px)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Biểu mẫu</th>
              <th className="px-2 py-2 text-right">Phiên</th>
              <th className="px-2 py-2 text-right">Vi phạm</th>
              <th className="px-2 py-2 text-right">Tuân thủ</th>
              <th className="px-2 py-2">Lỗi nổi bật</th>
              <th className="px-2 py-2">Khoa yếu nhất</th>
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
  return (
    <tr
      className={`cursor-pointer border-b border-slate-100 transition-colors ${
        active ? "bg-sky-50/80" : "hover:bg-slate-50"
      }`}
      onClick={onSelect}
    >
      <td className="px-3 py-2">
        <p className="font-semibold text-slate-800">{row.ma_bk}</p>
        <p className="max-w-[220px] truncate text-[11px] text-slate-500" title={label}>
          {label}
        </p>
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{row.tong_phien}</td>
      <td className="px-2 py-2 text-right tabular-nums font-medium text-red-700">{row.tong_vi_pham}</td>
      <td className={`px-2 py-2 text-right tabular-nums font-bold ${complianceClass(row.ty_le_tuan_thu)}`}>
        {formatPercent2(row.ty_le_tuan_thu)}
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
      <td className="px-2 py-2 text-[11px] text-slate-600">
        {row.worst_khoa_ten ? (
          <>
            {row.worst_khoa_ten}
            {row.worst_khoa_ty_le != null ? ` · ${formatPercent2(row.worst_khoa_ty_le)}` : ""}
          </>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
