"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

type Props = {
  icon?: React.ReactNode;
  summary: React.ReactNode;
  detail?: React.ReactNode;
  className?: string;
  dismissible?: boolean;
};

/** Banner / notice — mobile: 1 dòng + mở rộng; desktop: hiện đủ. */
export function MobileCollapsibleNotice({
  icon,
  summary,
  detail,
  className = "",
  dismissible = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hasDetail = Boolean(detail);

  if (dismissed) return null;

  return (
    <div className={className} role="status">
      <div className="flex items-start gap-2">
        {icon}
        <div className="min-w-0 flex-1 text-sm leading-snug">
          <div>{summary}</div>
          {hasDetail ? (
            <div className={`mt-1.5 text-xs leading-relaxed sm:text-sm ${expanded ? "block" : "hidden"} sm:block`}>
              {detail}
            </div>
          ) : null}
          {hasDetail ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-[var(--primary)] touch-manipulation sm:hidden"
            >
              {expanded ? (
                <>
                  Thu gọn <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                </>
              ) : (
                <>
                  Xem thêm <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </button>
          ) : null}
        </div>
        {dismissible ? (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-black/5 touch-manipulation sm:hidden"
            aria-label="Ẩn thông báo"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
