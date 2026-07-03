"use client";

import React from "react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { KsnkSupervisionHero } from "@/components/shared/ksnk-supervision-chrome";

type Props = {
  eyebrow?: string | null;
  title: React.ReactNode;
  description?: string | null;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  sticky?: boolean;
  /** @deprecated Dùng layout toolbar mặc định khi có filterBar. */
  compact?: boolean;
};

/**
 * Khung analytics — một thanh sticky: tiêu đề | thao tác, rồi bộ lọc (không lồng card).
 */
export function Bv103AnalyticsPageFrame({
  eyebrow,
  title,
  description,
  actions,
  filterBar,
  children,
  sticky = true,
}: Props) {
  const shell = sticky ? bv103DesignTokens.analyticsToolbarShell : bv103DesignTokens.analyticsToolbarShellStatic;

  return (
    <div className={bv103DesignTokens.pageOuterAnalytics}>
      {filterBar ? (
        <div className={shell}>
          <div className="flex min-h-9 items-center justify-between gap-3">
            <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-slate-900">{title}</h1>
            {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">{filterBar}</div>
        </div>
      ) : (
        <KsnkSupervisionHero eyebrow={eyebrow} title={title} description={description} actions={actions} />
      )}
      <div className={bv103DesignTokens.pageSectionGap}>{children}</div>
    </div>
  );
}

export function Bv103AnalyticsPageSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <div className={`${bv103DesignTokens.pageOuterAnalytics} animate-pulse`}>
      <div className="h-20 rounded-xl border border-slate-100 bg-slate-50" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: kpiCount }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
