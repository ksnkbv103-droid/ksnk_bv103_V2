"use client";

import React from "react";
import { bv103DesignTokens as T } from "@/lib/bv103-design-tokens";

export type ReportSectionId =
  | "bc-kpi"
  | "bc-trend"
  | "bc-vst"
  | "bc-gsc"
  | "bc-gsc-bk"
  | "bc-nkbv"
  | "bc-chuyen-de"
  | "bc-phan-iii";

const SECTIONS: { id: ReportSectionId; label: string }[] = [
  { id: "bc-kpi", label: "Tổng quan" },
  { id: "bc-trend", label: "Xu hướng" },
  { id: "bc-vst", label: "VST" },
  { id: "bc-gsc", label: "GSC" },
  { id: "bc-gsc-bk", label: "BK cần can thiệp" },
  { id: "bc-nkbv", label: "NKBV" },
  { id: "bc-chuyen-de", label: "Chuyên đề" },
  { id: "bc-phan-iii", label: "Phần III" },
];

type Props = {
  activeId?: ReportSectionId;
};

export function ReportSectionNav({ activeId }: Props) {
  return (
    <nav aria-label="Mục lục báo cáo" className={T.reportSectionNav}>
      <ul className="flex min-w-max items-center gap-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`inline-flex min-h-9 items-center rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors touch-manipulation ${
                activeId === s.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ReportSection({
  id,
  title,
  children,
  className = "",
}: {
  id: ReportSectionId;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-4 md:scroll-mt-24 ${className}`}>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}
