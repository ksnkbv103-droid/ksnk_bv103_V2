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
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="bv103-type-section text-slate-800">{title}</h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Dưới {VST_KHOA_CHART_THRESHOLDS.warnPct}% vàng, dưới {VST_KHOA_CHART_THRESHOLDS.redPct}% đỏ; dưới{" "}
        {VST_COMPARE_MIN_SAMPLE} cơ hội thì xám (mẫu mỏng).
      </p>
      {loading ? (
        <p className="mt-3 text-sm text-slate-400">Đang tải…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Chưa có dữ liệu</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((m) => (
            <li key={m.ten} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
              <span className="truncate text-xs font-medium text-slate-800" title={m.ten}>
                {m.ten}
              </span>
              <div
                className="h-3 overflow-hidden rounded bg-slate-100"
                role="img"
                aria-label={`${m.ten}: ${formatPercent1(m.pct)}`}
              >
                <div
                  className="h-full rounded"
                  style={{
                    width: `${Math.min(100, Math.max(0, m.pct))}%`,
                    backgroundColor: complianceBarColor("#10b981", m.pct, VST_KHOA_CHART_THRESHOLDS, {
                      sample: m.tong_co_hoi,
                      minSample: VST_COMPARE_MIN_SAMPLE,
                    }),
                  }}
                />
              </div>
              <span className="min-w-[8.5rem] text-right text-xs tabular-nums text-slate-600">
                <b className="text-sm text-slate-800">{formatPercent1(m.pct)}</b> · {m.da_tuan_thu.toLocaleString()}/
                {m.tong_co_hoi.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
