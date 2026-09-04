"use client";

import React from "react";
import { bv103DesignTokens } from "@/lib/bv103-design-tokens";
import { KsnkPageChrome } from "@/components/shared/KsnkPageChrome";
import { ThongKeChromeSlot, useThongKeChrome } from "@/components/shared/ThongKeChromeContext";

type Props = {
  eyebrow?: string | null;
  title: React.ReactNode;
  description?: string | null;
  actions?: React.ReactNode;
  filterBar?: React.ReactNode;
  children: React.ReactNode;
  sticky?: boolean;
  /**
   * Khi layout `/thong-ke` đã có sticky chrome — đẩy filter/actions lên band cha,
   * không tạo shell L1 thứ hai.
   */
  embedded?: boolean;
  /** @deprecated */
  compact?: boolean;
};

/**
 * Khung analytics — `KsnkPageChrome` + filters (page-chrome-contract).
 */
export function Bv103AnalyticsPageFrame({
  eyebrow,
  title,
  description,
  actions,
  filterBar,
  children,
  sticky = true,
  embedded = false,
}: Props) {
  const thongKe = useThongKeChrome();

  if (embedded || thongKe) {
    return (
      <div className={bv103DesignTokens.pageSectionGap}>
        <ThongKeChromeSlot filters={filterBar} actions={actions} />
        {children}
      </div>
    );
  }

  return (
    <div className={bv103DesignTokens.pageOuterAnalytics}>
      {filterBar || actions ? (
        <KsnkPageChrome
          eyebrow={eyebrow}
          title={title}
          subtitle={description}
          actions={actions}
          filters={filterBar}
          showTitle={false}
          sticky={sticky && Boolean(filterBar)}
        />
      ) : null}
      <div className={bv103DesignTokens.pageSectionGap}>{children}</div>
    </div>
  );
}

export function Bv103AnalyticsPageSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <div className={`${bv103DesignTokens.pageOuterAnalytics} animate-pulse`}>
      <div className="h-16 rounded-[var(--radius-shell)] border border-slate-100 bg-slate-50" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: kpiCount }, (_, i) => (
          <div key={i} className="h-20 rounded-[var(--radius-shell)] bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
