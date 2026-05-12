// src/app/giam-sat-vst/lich-su/page.tsx
import React from "react";
import Link from "next/link";
import HistoryTable from "@/modules/giam-sat-vst/components/HistoryTable";

/**
 * Trang lịch sử VST — HistoryTable tự quản lý fetch server-side pagination,
 * không cần pre-fetch sessions ở tầng Server Component nữa.
 */
export default function VSTHistoryPage() {
  return (
    <div className="space-y-8 pb-12">
      <header className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/90 p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.04] md:flex md:items-start md:justify-between md:p-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vệ sinh tay (WHO)</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">Lịch sử phiên giám sát</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">Danh sách các phiên đã lưu; quay lại trang chính để tạo phiên mới.</p>
        </div>
        <Link
          href="/giam-sat-vst"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] md:mt-0 md:shrink-0"
        >
          Tạo phiên mới
        </Link>
      </header>

      <div className="app-data-shell overflow-hidden p-2">
        <HistoryTable />
      </div>
    </div>
  );
}
