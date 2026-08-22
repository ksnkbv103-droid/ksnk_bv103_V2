"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { bv103LayoutChrome as C } from "@/lib/bv103-layout-chrome";

export type ReportSectionId =
  | "bc-kpi"
  | "bc-trend"
  | "bc-vst"
  | "bc-gsc"
  | "bc-gsc-bk"
  | "bc-dimension"
  | "bc-thoi-diem"
  | "bc-nkbv"
  | "bc-cssd"
  | "bc-chuyen-de"
  | "bc-phan-iii";

/** Mục chính — in họp: số + xu hướng + khoa kém + nhận xét. */
const PRIMARY_SECTIONS: { id: ReportSectionId; label: string; mobileLabel?: string }[] = [
  { id: "bc-kpi", label: "Tổng quan" },
  { id: "bc-trend", label: "Xu hướng" },
  { id: "bc-vst", label: "Vệ sinh tay" },
  { id: "bc-gsc", label: "Giám sát chung" },
  { id: "bc-nkbv", label: "NKBV" },
  { id: "bc-phan-iii", label: "Phần III", mobileLabel: "P.III" },
];

/** Mục phụ — chỉ render khi mở «Thêm». */
export const BCTH_MORE_SECTIONS: { id: ReportSectionId; label: string }[] = [
  { id: "bc-gsc-bk", label: "Bảng kiểm cần can thiệp" },
  { id: "bc-dimension", label: "Đa chiều" },
  { id: "bc-thoi-diem", label: "Thời điểm" },
  { id: "bc-chuyen-de", label: "Chuyên đề" },
  { id: "bc-cssd", label: "Phụ lục CSSD" },
];

const MORE_SECTIONS = BCTH_MORE_SECTIONS;

type Props = {
  activeId?: ReportSectionId;
  moreOpen?: boolean;
  onMoreOpenChange?: (open: boolean) => void;
};

function sectionLinkClass(active: boolean) {
  return `${C.navTabBtn} ${
    active
      ? "bg-slate-900 text-white shadow-sm"
      : "bg-transparent text-slate-600 hover:bg-white hover:text-slate-900"
  }`;
}

export function ReportSectionNav({ activeId, moreOpen: moreOpenProp, onMoreOpenChange }: Props) {
  const moreActive = MORE_SECTIONS.some((s) => s.id === activeId);
  const [moreOpenInner, setMoreOpenInner] = useState(moreActive);
  const moreOpen = moreOpenProp ?? moreOpenInner;
  const setMoreOpen = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(moreOpen) : next;
    setMoreOpenInner(value);
    onMoreOpenChange?.(value);
  };

  return (
    <nav aria-label="Mục lục báo cáo" className="sticky top-[5.25rem] z-10 mb-3">
      <div className={C.navTabStrip}>
        {PRIMARY_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={sectionLinkClass(activeId === s.id)}
          >
            <span className="sm:hidden">{s.mobileLabel ?? s.label}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </a>
        ))}
        <button
          type="button"
          className={`${sectionLinkClass(moreActive)} gap-1`}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          Thêm
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
      {moreOpen ? (
        <ul className="mt-1.5 flex min-w-max flex-wrap items-center gap-0.5 rounded-[var(--radius-control)] border border-slate-200/90 bg-white px-1.5 py-1">
          {MORE_SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={sectionLinkClass(activeId === s.id)}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
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
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}
