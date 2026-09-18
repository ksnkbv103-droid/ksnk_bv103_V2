"use client";

import React, { useMemo } from "react";
import type { GapKhoaRow } from "@/lib/analytics/supervision-matrix-mappers";
import { comparableGapRows } from "@/lib/analytics/supervision-source-lens";
import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";

type Props = {
  rows: GapKhoaRow[];
  source: "vst" | "gsc";
  loading?: boolean;
};

function fmt(source: "vst" | "gsc", n: number | null): string {
  if (n == null) return "—";
  return source === "vst" ? formatPercent1(n) : formatPercent2(n);
}

/**
 * Lớp 2 — chỉ khoa có cả TGS và chuyên trách trong kỳ.
 */
export function SupervisionDoiSoatPanel({ rows, source, loading }: Props) {
  const data = useMemo(() => {
    return comparableGapRows(rows)
      .map((r) => ({
        ...r,
        delta: (r.ty_le_tgs ?? 0) - (r.ty_le_ksnk ?? 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [rows]);

  if (loading) {
    return <div className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Đối soát tự giám sát vs chuyên trách
      </h4>
      <p className="mt-1 text-[11px] text-slate-500">
        Chỉ khoa có <span className="font-medium">cả hai</span> nguồn trong kỳ. Dương = tự báo cao hơn chuyên trách.
      </p>
      {data.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">Chưa có khoa comparable trong phạm vi lọc.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] uppercase text-slate-500">
                <th className="py-2 pr-2 font-medium">Khoa</th>
                <th className="py-2 px-2 font-medium text-right">Tự GS %</th>
                <th className="py-2 px-2 font-medium text-right">Chuyên trách %</th>
                <th className="py-2 pl-2 font-medium text-right">Lệch</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 12).map((r) => (
                <tr key={r.id} className="border-b border-slate-50">
                  <td className="py-1.5 pr-2 font-medium text-slate-800">{r.label}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-amber-800">{fmt(source, r.ty_le_tgs)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-sky-800">{fmt(source, r.ty_le_ksnk)}</td>
                  <td
                    className={`py-1.5 pl-2 text-right tabular-nums font-semibold ${
                      r.delta > 5 ? "text-red-700" : r.delta < -5 ? "text-emerald-700" : "text-slate-600"
                    }`}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {fmt(source, r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
