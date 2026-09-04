// src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatStatsPanel.tsx
"use client";

import { dashboardChrome as UI } from "@/modules/dashboard/lib/dashboard-chrome";
import React, { useMemo } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { HoaChatRow } from "../actions/hoa-chat.types";
import { formatDateVi } from "@/lib/format-datetime-vi";

interface Props {
  data: HoaChatRow[];
}

function daysDiff(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className={UI.kpiCaption}>—</span>;
  if (days < 0)
    return (
      <span className={`${UI.statusBadge} border-red-200 bg-red-100 text-red-700`}>
        <AlertTriangle size={10} className="mr-1 inline" /> Đã hết hạn
      </span>
    );
  if (days <= 30)
    return (
      <span className={`${UI.statusBadge} border-orange-200 bg-orange-100 text-orange-700`}>
        <AlertTriangle size={10} className="mr-1 inline" /> {days} ngày
      </span>
    );
  if (days <= 90)
    return (
      <span className={`${UI.statusBadge} border-amber-200 bg-amber-50 text-amber-700`}>
        <Clock size={10} className="mr-1 inline" /> {days} ngày
      </span>
    );
  return <span className={UI.kpiCaption}>{days} ngày</span>;
}

export default function HoaChatStatsPanel({ data }: Props) {
  const stats = useMemo(() => {
    const active = data.filter((r) => r.is_active !== false);
    const hoaChatCount = active.filter((r) => r.loai_hoa_chat === "HOA_CHAT" || !r.loai_hoa_chat).length;
    const vatTuCount = active.filter((r) => r.loai_hoa_chat === "VAT_TU").length;
    const testCount = active.filter((r) => r.loai_hoa_chat === "TEST").length;

    const withExpiry = active.filter((r) => r.han_su_dung);
    const expired = withExpiry.filter((r) => (daysDiff(r.han_su_dung) ?? 0) < 0);
    const expiring30 = withExpiry.filter((r) => {
      const d = daysDiff(r.han_su_dung);
      return d !== null && d >= 0 && d <= 30;
    });
    const expiring90 = withExpiry.filter((r) => {
      const d = daysDiff(r.han_su_dung);
      return d !== null && d > 30 && d <= 90;
    });

    const alerts = [...expired, ...expiring30].sort((a, b) => {
      const da = daysDiff(a.han_su_dung) ?? 9999;
      const db = daysDiff(b.han_su_dung) ?? 9999;
      return da - db;
    });

    return {
      total: active.length,
      hoaChatCount,
      vatTuCount,
      testCount,
      expiredCount: expired.length,
      expiring30Count: expiring30.length,
      expiring90Count: expiring90.length,
      alerts,
    };
  }, [data]);

  return (
    <div className={`${UI.sectionGap} animate-in fade-in duration-300`}>
      {/* Compact KPI strip — one row, not 4-col wall */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 px-3 py-2 text-[11px]">
        <span className="font-semibold text-slate-800">
          Tổng <span className="tabular-nums text-[var(--primary)]">{stats.total}</span>
        </span>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <span className="text-blue-700">
          Hóa chất <span className="font-semibold tabular-nums">{stats.hoaChatCount}</span>
        </span>
        <span className="text-purple-700">
          Vật tư <span className="font-semibold tabular-nums">{stats.vatTuCount}</span>
        </span>
        <span className="text-teal-700">
          Test <span className="font-semibold tabular-nums">{stats.testCount}</span>
        </span>
        {(stats.expiredCount > 0 || stats.expiring30Count > 0 || stats.expiring90Count > 0) && (
          <>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            {stats.expiredCount > 0 ? (
              <span className="font-semibold text-red-700">{stats.expiredCount} hết hạn</span>
            ) : null}
            {stats.expiring30Count > 0 ? (
              <span className="font-semibold text-orange-700">{stats.expiring30Count} &lt; 30 ngày</span>
            ) : null}
            {stats.expiring90Count > 0 ? (
              <span className="text-amber-700">{stats.expiring90Count} &lt; 90 ngày</span>
            ) : null}
          </>
        )}
      </div>

      {stats.alerts.length > 0 && (
        <div className={`${UI.noticeWarning} space-y-2 p-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <h3 className={`${UI.panelTitle} text-sm text-amber-800`}>Cảnh báo hạn sử dụng</h3>
          </div>
          <div className="max-h-[140px] divide-y divide-amber-100 overflow-y-auto rounded-lg border border-amber-200 bg-white">
            {stats.alerts.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-amber-50/40"
              >
                <div className="min-w-0 flex-1">
                  <p className={`${UI.innerTableCell} truncate text-xs font-semibold text-slate-800`}>
                    {item.ten_hoa_chat || "—"}
                  </p>
                  <p className={UI.innerTableCode}>{item.ma_hoa_chat}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={UI.kpiCaption}>{formatDateVi(item.han_su_dung)}</span>
                  <ExpiryBadge days={daysDiff(item.han_su_dung)} />
                </div>
              </div>
            ))}
            {stats.alerts.length > 8 && (
              <div className={`${UI.kpiCaption} bg-amber-50 px-3 py-1.5 text-center text-amber-600`}>
                + {stats.alerts.length - 8} mục khác
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
