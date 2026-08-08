"use client";

import React from "react";
import { MobileCollapsibleNotice } from "@/components/shared/MobileCollapsibleNotice";
import { cn } from "@/lib/utils";

export type KsnkContextBannerTone = "sky" | "amber" | "violet" | "emerald" | "slate" | "rose";

const TONE_CLASS: Record<KsnkContextBannerTone, string> = {
  sky: "rounded-[var(--radius-shell)] border border-sky-200 bg-sky-50/80 px-3 py-2 text-sky-900 sm:px-4 sm:py-3",
  amber:
    "rounded-[var(--radius-shell)] border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-950 sm:px-4 sm:py-3",
  violet:
    "rounded-[var(--radius-shell)] border border-violet-200 bg-violet-50/80 px-3 py-2 text-violet-950 sm:px-4 sm:py-3",
  emerald:
    "rounded-[var(--radius-shell)] border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-emerald-950 sm:px-4 sm:py-3",
  slate:
    "rounded-[var(--radius-shell)] border border-slate-200 bg-slate-50/90 px-3 py-2 text-slate-800 sm:px-4 sm:py-3",
  rose: "rounded-[var(--radius-shell)] border border-red-300 bg-red-50/80 px-3 py-2 text-red-950 sm:px-4 sm:py-3",
};

type Props = {
  tone?: KsnkContextBannerTone;
  icon?: React.ReactNode;
  summary: React.ReactNode;
  detail?: React.ReactNode;
  dismissible?: boolean;
  className?: string;
};

/** Banner ngữ cảnh thống nhất (scope / lock / health) — dialect matrix Wave 1. */
export function KsnkContextBanner({
  tone = "sky",
  icon,
  summary,
  detail,
  dismissible = true,
  className,
}: Props) {
  return (
    <MobileCollapsibleNotice
      className={cn(TONE_CLASS[tone], className)}
      icon={icon}
      summary={summary}
      detail={detail}
      dismissible={dismissible}
    />
  );
}
