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
  /** Mặc định false — App Header là SSOT tên trang; chỉ bật khi nested detail thiếu ngữ cảnh sidebar. */
  showTitle?: boolean;
  sticky?: boolean;
  className?: string;
};

/**
 * Band L1 duy nhất dưới App Header — page-chrome-contract-20260731.
 * Một hàng công cụ: Tab trái · Nút phải. Không lặp H1 module (App Header SSOT).
 * Filters xuống hàng riêng khi có.
 */
export function KsnkPageChrome({
  eyebrow,
  title,
  subtitle,
  actions,
  tabs,
  filters,
  showTitle = false,
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
  const actionCluster = hasActions ? (
    <div className="bv103-action-row shrink-0">{actions}</div>
  ) : null;

  return (
    <header className={cn(shell, className)}>
      {hasTitleBlock ? (
        <div className="flex w-full items-center justify-between gap-2">
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
          {!hasTabs ? actionCluster : null}
        </div>
      ) : null}

      {hasTabs || (hasActions && (!hasTitleBlock || hasTabs)) ? (
        <div
          className={cn(
            "flex w-full items-center gap-2",
            hasTitleBlock ? "mt-[var(--bv103-space-2)]" : null,
          )}
        >
          {hasTabs ? <div className="min-w-0 flex-1">{tabs}</div> : null}
          {actionCluster && (hasTabs || !hasTitleBlock) ? actionCluster : null}
        </div>
      ) : null}

      {hasFilters ? (
        <div
          className={cn(
            "[&:has(>.chrome-slot:empty)]:hidden",
            hasTitleBlock || hasTabs || hasActions ? "mt-[var(--bv103-space-2)]" : null,
          )}
        >
          {filters}
        </div>
      ) : null}
    </header>
  );
}
