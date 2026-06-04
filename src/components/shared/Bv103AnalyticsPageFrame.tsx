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
  /** Bọc sticky shell (dashboard có filter). */
  sticky?: boolean;
};

/** Khung trang analytics / báo cáo — đồng bộ Command Center & Báo cáo tổng hợp. */
export function Bv103AnalyticsPageFrame({
  eyebrow,
  title,
  description,
  actions,
  filterBar,
  children,
  sticky = true,
}: Props) {
  const hero = (
    <KsnkSupervisionHero eyebrow={eyebrow} title={title} description={description} actions={actions} />
  );

  return (
    <div className={bv103DesignTokens.pageOuterAnalytics}>
      {filterBar ? (
        <div className={sticky ? bv103DesignTokens.stickyAnalyticsShell : "space-y-5"}>
          {hero}
          <div className="mt-5 border-t border-slate-100 pt-5">{filterBar}</div>
        </div>
      ) : (
        hero
      )}
      <div className={bv103DesignTokens.pageSectionGap}>{children}</div>
    </div>
  );
}

export function Bv103AnalyticsPageSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <div className={`${bv103DesignTokens.pageOuterAnalytics} animate-pulse`}>
      <div className={`h-28 ${bv103DesignTokens.skeletonBlock}`} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: kpiCount }, (_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
