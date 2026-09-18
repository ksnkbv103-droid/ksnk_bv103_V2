"use client";

import React from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Award } from "lucide-react";
import { formatPercent1, formatPercent2 } from "@/lib/analytics/supervision-percent";
import {
  complianceToneFromPercent,
  khoaChartTone,
  VST_KHOA_CHART_THRESHOLDS,
  type ComplianceTone,
} from "@/lib/analytics/supervision-thresholds";
import type { ActionBoardModel, ActionBoardRankRow, ActionBoardSource } from "@/lib/analytics/supervision-action-board";

function fmtPct(source: ActionBoardSource, value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return source === "vst" ? formatPercent1(value) : formatPercent2(value);
}

function toneClass(tone: ComplianceTone): string {
  if (tone === "red") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "yellow") return "border-amber-200 bg-amber-50 text-amber-950";
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function RankList({
  title,
  icon: Icon,
  iconClass,
  rows,
  source,
  empty,
  thresholds,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconClass: string;
  rows: ActionBoardRankRow[];
  source: ActionBoardSource;
  empty: string;
  thresholds?: { warnPct: number; redPct: number };
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <Icon size={14} className={iconClass} aria-hidden />
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const tone = thresholds
              ? khoaChartTone(r.tyLe, thresholds)
              : complianceToneFromPercent(r.tyLe);
            return (
              <li
                key={r.ten}
                className={`flex items-start justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${toneClass(tone)}`}
              >
                <span className="min-w-0 font-medium leading-snug">{r.ten}</span>
                <span className="shrink-0 tabular-nums text-xs font-semibold">
                  {fmtPct(source, r.tyLe)}
                  <span className="ml-1 font-normal opacity-70">({r.tong})</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Props = {
  model: ActionBoardModel;
  loading?: boolean;
  /** Ghi chú ngắn dưới tiêu đề */
  hint?: string;
};

/**
 * Bảng hành động cô đúc: thấp nhất · điển hình · lỗi hay gặp — tách VST / GSC.
 */
export function SupervisionActionBoard({ model, loading, hint }: Props) {
  const thresholds = model.source === "vst" ? VST_KHOA_CHART_THRESHOLDS : undefined;
  const title = model.source === "vst" ? "Vệ sinh tay — việc cần làm" : "Giám sát chung — việc cần làm";

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-2">
      <header className="px-0.5">
        <h3 className="bv103-type-section text-slate-800">{title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
          {hint ??
            `Xếp hạng khoa có mẫu số ≥ ${model.minSample} ${
              model.source === "vst" ? "cơ hội" : "quan sát"
            }. Lỗi = thời điểm WHO (VST) hoặc tiêu chí vi phạm (GSC).`}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <RankList
          title="Tuân thủ thấp nhất"
          icon={ArrowDownRight}
          iconClass="text-red-600"
          rows={model.lowest}
          source={model.source}
          empty="Chưa đủ mẫu hoặc chưa có khoa dưới ngưỡng."
          thresholds={thresholds}
        />
        <RankList
          title="Điển hình (cao nhất)"
          icon={Award}
          iconClass="text-emerald-600"
          rows={model.highest}
          source={model.source}
          empty={`Chưa có khoa đạt mẫu số ≥ ${model.minSample}.`}
          thresholds={thresholds}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <AlertTriangle size={14} className="text-amber-600" aria-hidden />
            Lỗi hay gặp
          </h4>
          {model.errors.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa ghi nhận lỗi nổi bật trong kỳ.</p>
          ) : (
            <ul className="space-y-1.5">
              {model.errors.map((e, i) => (
                <li
                  key={`${e.ten}-${i}`}
                  className="rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-1.5 text-sm text-amber-950"
                >
                  <p className="font-medium leading-snug">{e.ten}</p>
                  <p className="text-[11px] text-amber-800/90">
                    {[e.detail, e.count != null ? `${e.count} lượt` : null, e.tyLe != null ? fmtPct(model.source, e.tyLe) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Deep-link từ BCTH sang thống kê module (so sánh đa chiều theo từng phân hệ). */
export function SupervisionActionDeepLink({ source }: { source: ActionBoardSource }) {
  const href = source === "vst" ? "/thong-ke/vst#so-sanh" : "/thong-ke/gsc#so-sanh";
  const label = source === "vst" ? "Chi tiết thống kê VST" : "Chi tiết thống kê GSC";
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
    >
      <ArrowUpRight size={14} aria-hidden />
      {label} — khối / khu vực / đối tượng
    </a>
  );
}
