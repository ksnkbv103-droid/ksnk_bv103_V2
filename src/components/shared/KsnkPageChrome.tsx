"use client";

import React from "react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";
import { cn } from "@/lib/utils";

export type KsnkPageChromeProps = {
  /** Eyebrow ngắn (vd. CSSD) — trên title. */
  eyebrow?: string | null;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Slot 2 — ModeNav / module tabs. */
  tabs?: React.ReactNode;
  /** Slot 3 — AnalyticsFilterBar / search. */
  filters?: React.ReactNode;
  /** Mặc định true khi có title. false = chỉ tabs/filters/actions (App Header đã có tên trang). */
  showTitle?: boolean;
  sticky?: boolean;
  className?: string;
};

/**
 * Band L1 duy nhất dưới App Header — page-chrome-contract-20260731.
 * Thứ tự: Title+Actions → Tabs → Filters.
 */
export function KsnkPageChrome({
  eyebrow,
  title,
  subtitle,
  actions,
  tabs,
  filters,
  showTitle = true,
  sticky = false,
  className,
}: KsnkPageChromeProps) {
  const eye = (eyebrow ?? "").trim();
  const desc =
    typeof subtitle === "string" ? subtitle.trim() : subtitle;
  const hasTitleBlock = showTitle && (title != null || Boolean(eye) || Boolean(desc));
  const hasActions = Boolean(actions);
  const hasTabs = Boolean(tabs);
  const hasFilters = Boolean(filters);

  if (!hasTitleBlock && !hasActions && !hasTabs && !hasFilters) return null;

  const shell = sticky ? T.pageChromeShellSticky : T.pageChromeShell;
  const showTitleRow = hasTitleBlock || (hasActions && showTitle);
  /** Actions cạnh title, hoặc hàng riêng khi không có title (vd. /thong-ke). */
  const actionsBesideTitle = hasActions && (hasTitleBlock || showTitle);
  const actionsAlone = hasActions && !actionsBesideTitle;

  return (
    <header className={cn(shell, className)}>
      {showTitleRow || actionsAlone ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {hasTitleBlock ? (
            <div className="min-w-0 flex-1">
              {eye ? <p className={`${T.pageEyebrow} max-sm:hidden`}>{eye}</p> : null}
              {title != null ? (
                <div className={cn(T.pageTitle, eye ? "mt-0.5" : null)}>{title}</div>
              ) : null}
              {desc ? (
                typeof desc === "string" ? (
                  <p className={`${T.pageSubtitle} max-sm:hidden`}>{desc}</p>
                ) : (
                  <div className={`${T.pageSubtitle} max-sm:hidden`}>{desc}</div>
                )
              ) : null}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {hasActions ? (
            <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasTabs ? (
        <div className={cn(showTitleRow || actionsAlone ? "mt-2 border-t border-slate-100 pt-2" : null)}>
          {tabs}
        </div>
      ) : null}

      {hasFilters ? (
        <div
          className={cn(
            "[&:has(>.chrome-slot:empty)]:hidden",
            showTitleRow || actionsAlone || hasTabs ? "mt-2 border-t border-slate-100 pt-2" : null,
          )}
        >
          {filters}
        </div>
      ) : null}
    </header>
  );
}
