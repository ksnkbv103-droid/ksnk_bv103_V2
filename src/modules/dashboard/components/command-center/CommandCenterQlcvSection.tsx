"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, ExternalLink } from "lucide-react";
import type { QlcvQuaHanBrief } from "@/modules/quan-ly-cong-viec/actions/qlcv-brief.actions";
import { dashboardChrome as D } from "../../lib/dashboard-chrome";

type Props = {
  brief: QlcvQuaHanBrief | null;
  loading?: boolean;
};

export function CommandCenterQlcvSection({ brief, loading }: Props) {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Đang tải công việc quá hạn…</p>
      </section>
    );
  }

  if (!brief) return null;

  const { totalCount, items } = brief;

  return (
    <section className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm ring-1 ring-amber-900/[0.04]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className={`flex items-center gap-2 ${D.sectionHeading}`}>
            <CalendarClock className="text-[var(--surface-warning-text)]" size={20} aria-hidden />
            Công việc quá hạn
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Tóm tắt từ module QLCV — {totalCount} phiếu đang quá hạn trong phạm vi bạn được xem
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--surface-warning-border)] bg-[var(--surface-warning-bg)] px-3 py-1 text-xs font-medium text-[var(--surface-warning-text)]">
          <AlertTriangle size={14} aria-hidden />
          {totalCount}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center text-sm text-slate-500">
          Không có việc quá hạn trong phạm vi hiện tại.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{row.tieu_de}</p>
                <p className="text-[11px] text-slate-500">
                  {row.nguoi_phu_trach_ten || "Chưa gán"} · Hạn{" "}
                  {row.han_hoan_thanh ? new Date(row.han_hoan_thanh).toLocaleDateString("vi-VN") : "—"} ·{" "}
                  {row.phan_tram_hoan_thanh}%
                </p>
              </div>
              <Link
                href={`/quan-ly-cong-viec?id=${row.id}`}
                className="shrink-0 text-[11px] font-medium text-[var(--primary)] hover:underline"
              >
                Mở
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/quan-ly-cong-viec"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
      >
        Mở Quản lý công việc <ExternalLink size={12} aria-hidden />
      </Link>
    </section>
  );
}
