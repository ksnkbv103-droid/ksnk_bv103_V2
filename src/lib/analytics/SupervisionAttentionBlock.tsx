"use client";

import React from "react";
import { SupervisionActionBoard } from "@/lib/analytics/SupervisionActionBoard";
import type { ActionBoardModel } from "@/lib/analytics/supervision-action-board";
import type { SupervisionAlert, SupervisionAlertSummary } from "@/lib/analytics/supervision-alerts";
import { DEFAULT_KHOA_CHART_THRESHOLDS, SUPERVISION_COMPLIANCE_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";

type Props = {
  alerts: SupervisionAlertSummary;
  board: ActionBoardModel;
  loading?: boolean;
};

function AlertGroup({
  title,
  tone,
  rows,
  detail,
}: {
  title: string;
  tone: string;
  rows: SupervisionAlert[];
  detail: (a: SupervisionAlert) => string;
}) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wide">
        {title} <span className="tabular-nums">({rows.length})</span>
      </h4>
      {rows.length === 0 ? (
        <p className="mt-1 text-xs opacity-70">Không có.</p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {rows.slice(0, 8).map((a) => (
            <li key={`${a.kind}-${a.khoaId || a.ten}`} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 font-medium leading-snug">{a.ten}</span>
              <span className="shrink-0 text-xs tabular-nums">{detail(a)}</span>
            </li>
          ))}
          {rows.length > 8 ? <li className="text-xs opacity-70">và {rows.length - 8} khoa khác</li> : null}
        </ul>
      )}
    </div>
  );
}

/** Khối «Cảnh báo · Cần chú ý» đầu trang thống kê VST/GSC (số tổng nằm ở hàng KPI ngay trên). */
export function SupervisionAttentionBlock({ alerts, board, loading }: Props) {
  if (loading) return <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />;
  const min = alerts.minSample;
  return (
    <section className="space-y-3">
      <header className="px-0.5">
        <h3 className="bv103-type-section text-slate-800">Cảnh báo trong kỳ</h3>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Đỏ dưới {DEFAULT_KHOA_CHART_THRESHOLDS.redPct}% · xanh từ {SUPERVISION_COMPLIANCE_THRESHOLDS.GOAL}% ·
          cần tối thiểu {min} mẫu theo khoa mới xếp hạng.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <AlertGroup
          title={`Dưới ${DEFAULT_KHOA_CHART_THRESHOLDS.redPct}%`}
          tone="border-red-200 bg-red-50 text-red-900"
          rows={alerts.duoi85}
          detail={(a) => `${a.tyLe?.toFixed(1)}% (n=${a.n})`}
        />
        <AlertGroup
          title="Chưa đủ mẫu"
          tone="border-slate-200 bg-slate-50 text-slate-700"
          rows={alerts.chuaDuMau}
          detail={(a) => `n=${a.n}/${min}`}
        />
        <AlertGroup
          title="Chưa có phiên"
          tone="border-amber-200 bg-amber-50 text-amber-950"
          rows={alerts.chuaCoPhien}
          detail={() => "—"}
        />
      </div>
      <SupervisionActionBoard model={board} showHighest={false} />
    </section>
  );
}
