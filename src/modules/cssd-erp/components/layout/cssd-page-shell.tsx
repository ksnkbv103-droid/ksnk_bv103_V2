"use client";

import React from "react";
import CSSDSubNav from "../navigation/CSSDSubNav";

/** Vỏ trang CSSD trong `KsnkPageShell` — không nhân đôi max-width/padding của `<main>`. */
export const CSSD_PAGE_OUTER =
  "w-full min-h-[40vh] space-y-6 pb-12 animate-in fade-in duration-500 touch-manipulation [-webkit-tap-highlight-color:transparent]";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Khung trang CSSD ERP: hero + SubNav + nội dung — đồng bộ với giám sát / Quản trị. */
export default function CSSDPageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className={CSSD_PAGE_OUTER}>
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-white to-slate-50/90 p-5 shadow-[var(--shadow-app-soft)] ring-1 ring-slate-900/[0.04] md:flex-row md:items-start md:justify-between md:p-6">
        <div className="min-w-0 space-y-1">
          <div className="text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">{title}</div>
          {subtitle != null && subtitle !== "" ? (
            <div className="max-w-xl text-sm leading-relaxed text-slate-600">{subtitle}</div>
          ) : null}
        </div>
        {actions != null ? <div className="flex shrink-0 flex-wrap items-center gap-2 md:pt-1">{actions}</div> : null}
      </header>
      <CSSDSubNav />
      {children}
    </div>
  );
}
