// src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatStatsPanel.tsx
"use client";

import { dashboardChrome as UI } from "@/modules/dashboard/lib/dashboard-chrome";
import React, { useMemo } from "react";
import { Beaker, FlaskConical, TestTube, AlertTriangle, Clock, TrendingUp, Package } from "lucide-react";
import type { HoaChatRow } from "../actions/hoa-chat.types";

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

const kpiCard =
  "flex flex-col gap-1 rounded-[var(--radius-shell)] border p-4";

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
    <div className={`${UI.sectionGap} animate-in fade-in slide-in-from-top-2 duration-500`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={`${kpiCard} border-[var(--primary)]/10 bg-[var(--primary)]/5`}>
          <div className="flex items-center gap-2 text-[var(--primary)]">
            <Package size={16} />
            <span className={UI.kpiLabel}>Tổng danh mục</span>
          </div>
          <span className={UI.kpiValuePrimary}>{stats.total}</span>
          <span className={`${UI.kpiCaption} text-[var(--primary)]/70`}>đang lưu hành</span>
        </div>

        <div className={`${kpiCard} border-blue-100 bg-blue-50/50`}>
          <div className="flex items-center gap-2 text-blue-600">
            <Beaker size={16} />
            <span className={`${UI.kpiLabel} text-blue-600`}>Hóa chất</span>
          </div>
          <span className={`${UI.kpiValue} text-blue-700`}>{stats.hoaChatCount}</span>
          <span className={`${UI.kpiCaption} text-blue-500`}>loại</span>
        </div>

        <div className={`${kpiCard} border-purple-100 bg-purple-50/50`}>
          <div className="flex items-center gap-2 text-purple-600">
            <FlaskConical size={16} />
            <span className={`${UI.kpiLabel} text-purple-600`}>Vật tư</span>
          </div>
          <span className={`${UI.kpiValue} text-purple-700`}>{stats.vatTuCount}</span>
          <span className={`${UI.kpiCaption} text-purple-500`}>loại</span>
        </div>

        <div className={`${kpiCard} border-teal-100 bg-teal-50/50`}>
          <div className="flex items-center gap-2 text-teal-600">
            <TestTube size={16} />
            <span className={`${UI.kpiLabel} text-teal-600`}>Test / Kit</span>
          </div>
          <span className={`${UI.kpiValue} text-teal-700`}>{stats.testCount}</span>
          <span className={`${UI.kpiCaption} text-teal-500`}>loại</span>
        </div>
      </div>

      {(stats.expiredCount > 0 || stats.expiring30Count > 0 || stats.expiring90Count > 0) && (
        <div className={`${UI.noticeWarning} space-y-3 p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className={`${UI.panelTitle} text-amber-800`}>Cảnh báo hạn sử dụng</h3>
            </div>
            <div className="flex gap-2">
              {stats.expiredCount > 0 && (
                <span className={`${UI.statusBadge} border-red-700 bg-red-600 text-white`}>
                  {stats.expiredCount} hết hạn
                </span>
              )}
              {stats.expiring30Count > 0 && (
                <span className={`${UI.statusBadge} border-orange-500 bg-orange-500 text-white`}>
                  {stats.expiring30Count} &lt; 30 ngày
                </span>
              )}
              {stats.expiring90Count > 0 && (
                <span className={`${UI.statusBadge} border-amber-400 bg-amber-400 text-slate-800`}>
                  {stats.expiring90Count} &lt; 90 ngày
                </span>
              )}
            </div>
          </div>

          {stats.alerts.length > 0 && (
            <div className="max-h-[200px] divide-y divide-amber-100 overflow-hidden overflow-y-auto rounded-xl border border-amber-200 bg-white">
              {stats.alerts.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`${UI.innerTableCell} truncate font-semibold text-slate-800`}>
                      {item.ten_hoa_chat || "—"}
                    </p>
                    <p className={UI.innerTableCode}>{item.ma_hoa_chat}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={UI.kpiCaption}>
                      {item.han_su_dung ? String(item.han_su_dung).slice(0, 10) : "—"}
                    </span>
                    <ExpiryBadge days={daysDiff(item.han_su_dung)} />
                  </div>
                </div>
              ))}
              {stats.alerts.length > 10 && (
                <div className={`${UI.kpiCaption} bg-amber-50 px-4 py-2 text-center text-amber-600`}>
                  + {stats.alerts.length - 10} hóa chất / vật tư khác
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 px-4 py-3">
        <TrendingUp size={16} className="shrink-0 text-slate-400" />
        <p className={`${UI.innerTableCell} text-[11px] leading-relaxed text-slate-500`}>
          <span className="font-semibold text-slate-700">Xu hướng tiêu thụ</span> — Để theo dõi lịch sử
          xuất/nhập và lập dự thầu chính xác, cần bổ sung ghi nhận giao dịch hóa chất theo ca/ngày. Liên hệ
          quản trị để kích hoạt tính năng này.
        </p>
      </div>
    </div>
  );
}
