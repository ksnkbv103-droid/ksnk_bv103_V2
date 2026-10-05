"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import {
  buildSupervisionCompareDeepLink,
  type AnalyticsUrlSeed,
} from "@/lib/analytics/supervision-deep-link";
import type { ActionBoardSource } from "@/lib/analytics/supervision-action-board";

/** Deep-link từ BCTH sang thống kê module (so sánh đa chiều theo từng phân hệ). */
export function SupervisionActionDeepLink({
  source,
  seed,
}: {
  source: ActionBoardSource;
  seed?: AnalyticsUrlSeed;
}) {
  const href = buildSupervisionCompareDeepLink(source, seed);
  const label = source === "vst" ? "Chi tiết thống kê VST" : "Chi tiết thống kê GSC";
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
    >
      <ArrowUpRight size={14} aria-hidden />
      {label} — khối / khu vực / đối tượng
    </a>
  );
}
