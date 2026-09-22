"use client";

import { ArrowUpRight } from "lucide-react";

export type SupervisionStatsModule = "vst" | "gsc";

/** Deep-link từ BCTH sang thống kê module (so sánh đa chiều theo từng phân hệ). */
export function SupervisionActionDeepLink({ source }: { source: SupervisionStatsModule }) {
  const href = source === "vst" ? "/thong-ke/vst#so-sanh" : "/thong-ke/gsc#so-sanh";
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
