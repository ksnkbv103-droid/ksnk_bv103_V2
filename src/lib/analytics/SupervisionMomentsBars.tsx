"use client";

import { formatPercent1, roundPercent1 } from "@/lib/analytics/supervision-percent";
import { complianceBarColor } from "@/lib/analytics/supervision-charts-shared";
import { VST_COMPARE_MIN_SAMPLE, VST_KHOA_CHART_THRESHOLDS } from "@/lib/analytics/supervision-thresholds";
import type { MomentRow } from "@/lib/analytics/supervision-charts-core";

/** Tuân thủ theo thời điểm WHO: mỗi hàng một cột ngang + số, tô màu theo ngưỡng VST (xanh/vàng/đỏ). */
export function SupervisionMomentsBars({
  title = "Tuân thủ theo thời điểm WHO",
  moments,
  loading,
}: {
  title?: string;
  moments: MomentRow[];
  loading?: boolean;
}) {
  const rows = moments.map((m) => ({ ...m, pct: roundPercent1(m.ty_le_tuan_thu) }));

  return (
    <section className="bv103-card">
      <div className="bv103-card-head flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">
          Dưới {VST_KHOA_CHART_THRESHOLDS.warnPct}% vàng, dưới {VST_KHOA_CHART_THRESHOLDS.redPct}% đỏ; dưới{" "}
          {VST_COMPARE_MIN_SAMPLE} cơ hội thì xám (mẫu mỏng).
        </p>
      </div>
      {loading ? (
        <p className="px-5 py-4 text-sm text-slate-400">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-400">Chưa có dữ liệu</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((m, i) => (
            <li
              key={m.ten}
              className="grid min-h-16 grid-cols-[minmax(0,1fr)_minmax(6rem,1fr)_auto] items-center gap-4 px-5 py-2 sm:grid-cols-[minmax(0,16rem)_1fr_auto]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                  {i + 1}
                </span>
                <span className="line-clamp-2 text-sm leading-snug text-slate-800" title={m.ten}>
                  {m.ten}
                </span>
              </span>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                role="img"
                aria-label={`${m.ten}: ${formatPercent1(m.pct)}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, m.pct))}%`,
                    backgroundColor: complianceBarColor("#10b981", m.pct, VST_KHOA_CHART_THRESHOLDS, {
                      sample: m.tong_co_hoi,
                      minSample: VST_COMPARE_MIN_SAMPLE,
                    }),
                  }}
                />
              </div>
              <span className="flex min-w-24 flex-col items-end gap-0.5 leading-tight tabular-nums">
                <span className="text-sm font-semibold text-slate-900">{formatPercent1(m.pct)}</span>
                <span className="text-xs text-slate-500">
                  {m.da_tuan_thu.toLocaleString("vi-VN")}/{m.tong_co_hoi.toLocaleString("vi-VN")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
