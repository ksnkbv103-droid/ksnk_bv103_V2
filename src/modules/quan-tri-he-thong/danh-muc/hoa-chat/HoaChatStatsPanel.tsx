// src/modules/quan-tri-he-thong/danh-muc/hoa-chat/HoaChatStatsPanel.tsx
"use client";

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
  if (days === null) return <span className="text-[11px] font-semibold text-slate-400">—</span>;
  if (days < 0) return <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700"><AlertTriangle size={10} /> ĐÃ HẾT HẠN</span>;
  if (days <= 30) return <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-black text-orange-700"><AlertTriangle size={10} /> {days} ngày</span>;
  if (days <= 90) return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700"><Clock size={10} /> {days} ngày</span>;
  return <span className="text-[11px] font-semibold text-slate-500">{days} ngày</span>;
}

export default function HoaChatStatsPanel({ data }: Props) {
  const stats = useMemo(() => {
    const active = data.filter(r => r.is_active !== false);
    const hoaChatCount = active.filter(r => r.loai_hoa_chat === "HOA_CHAT" || !r.loai_hoa_chat).length;
    const vatTuCount = active.filter(r => r.loai_hoa_chat === "VAT_TU").length;
    const testCount = active.filter(r => r.loai_hoa_chat === "TEST").length;

    const withExpiry = active.filter(r => r.han_su_dung);
    const expired = withExpiry.filter(r => (daysDiff(r.han_su_dung) ?? 0) < 0);
    const expiring30 = withExpiry.filter(r => { const d = daysDiff(r.han_su_dung); return d !== null && d >= 0 && d <= 30; });
    const expiring90 = withExpiry.filter(r => { const d = daysDiff(r.han_su_dung); return d !== null && d > 30 && d <= 90; });

    // Cảnh báo: sắp hết hạn hoặc đã hết
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
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
      {/* Thẻ tóm tắt */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[var(--radius-shell)] border border-[var(--primary)]/10 bg-[var(--primary)]/5 p-4">
          <div className="flex items-center gap-2 text-[var(--primary)]">
            <Package size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--primary)]/70">Tổng danh mục</span>
          </div>
          <span className="text-3xl font-semibold tabular-nums text-[var(--primary)]">{stats.total}</span>
          <span className="text-[11px] font-semibold uppercase text-[var(--primary)]/60">đang lưu hành</span>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius-shell)] border border-blue-100 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Beaker size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">Hóa chất</span>
          </div>
          <span className="text-3xl font-black text-blue-700">{stats.hoaChatCount}</span>
          <span className="text-[11px] font-semibold uppercase text-blue-400">loại</span>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius-shell)] border border-purple-100 bg-purple-50/50 p-4">
          <div className="flex items-center gap-2 text-purple-600">
            <FlaskConical size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-purple-500">Vật tư</span>
          </div>
          <span className="text-3xl font-black text-purple-700">{stats.vatTuCount}</span>
          <span className="text-[11px] font-semibold uppercase text-purple-400">loại</span>
        </div>

        <div className="flex flex-col gap-1 rounded-[var(--radius-shell)] border border-teal-100 bg-teal-50/50 p-4">
          <div className="flex items-center gap-2 text-teal-600">
            <TestTube size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-teal-500">Test / Kit</span>
          </div>
          <span className="text-3xl font-black text-teal-700">{stats.testCount}</span>
          <span className="text-[11px] font-semibold uppercase text-teal-400">loại</span>
        </div>
      </div>

      {/* Cảnh báo hạn sử dụng */}
      {(stats.expiredCount > 0 || stats.expiring30Count > 0 || stats.expiring90Count > 0) && (
        <div className="rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                Cảnh báo hạn sử dụng
              </h3>
            </div>
            <div className="flex gap-2">
              {stats.expiredCount > 0 && (
                <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-black text-white">
                  {stats.expiredCount} hết hạn
                </span>
              )}
              {stats.expiring30Count > 0 && (
                <span className="rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-black text-white">
                  {stats.expiring30Count} &lt; 30 ngày
                </span>
              )}
              {stats.expiring90Count > 0 && (
                <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black text-slate-800">
                  {stats.expiring90Count} &lt; 90 ngày
                </span>
              )}
            </div>
          </div>

          {stats.alerts.length > 0 && (
            <div className="divide-y divide-amber-100 rounded-xl border border-amber-200 bg-white overflow-hidden max-h-[200px] overflow-y-auto">
              {stats.alerts.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5 gap-3 hover:bg-amber-50/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-slate-800 truncate">{item.ten_hoa_chat || "—"}</p>
                    <p className="text-[11px] font-mono font-semibold text-slate-500">{item.ma_hoa_chat}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {item.han_su_dung ? String(item.han_su_dung).slice(0, 10) : "—"}
                    </span>
                    <ExpiryBadge days={daysDiff(item.han_su_dung)} />
                  </div>
                </div>
              ))}
              {stats.alerts.length > 10 && (
                <div className="px-4 py-2 text-center text-[11px] font-semibold text-amber-600 bg-amber-50">
                  + {stats.alerts.length - 10} hóa chất / vật tư khác
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ghi chú xu hướng */}
      <div className="flex items-center gap-3 rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/80 px-4 py-3">
        <TrendingUp size={16} className="text-slate-400 shrink-0" />
        <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
          <span className="font-black text-slate-700">Xu hướng tiêu thụ</span> — Để theo dõi lịch sử xuất/nhập và lập dự thầu chính xác, cần bổ sung ghi nhận giao dịch hóa chất theo ca/ngày. Liên hệ quản trị để kích hoạt tính năng này.
        </p>
      </div>
    </div>
  );
}
