"use client";

import React from "react";

export type NkbvDiagnosticRowProps = {
  step: number | string;
  title: string;
  hint?: string;
  /** Nội dung cột phải (tiêu chuẩn / nhập liệu) */
  children: React.ReactNode;
  /** Trạng thái chỉ đọc trên cột trái (mốc đã tính) */
  milestone?: React.ReactNode;
  tone?: "default" | "sky" | "emerald" | "amber" | "rose";
};

const toneClass: Record<NonNullable<NkbvDiagnosticRowProps["tone"]>, string> = {
  default: "border-slate-200 bg-white",
  sky: "border-sky-200 bg-sky-50/40",
  emerald: "border-emerald-200 bg-emerald-50/40",
  amber: "border-amber-200 bg-amber-50/40",
  rose: "border-rose-200 bg-rose-50/40",
};

/**
 * Một hàng chẩn đoán: trái = mốc thời gian, phải = tiêu chuẩn / nhập.
 * Mobile: xếp dọc (mốc → nhập).
 */
export default function NkbvDiagnosticRow({
  step,
  title,
  hint,
  children,
  milestone,
  tone = "default",
}: NkbvDiagnosticRowProps) {
  return (
    <section
      className={`rounded-2xl border ${toneClass[tone]} shadow-sm`}
      data-diagnostic-step={step}
    >
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
        <div className="space-y-2 border-b border-inherit px-4 py-5 sm:px-5 lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
              {step}
            </span>
            <div className="min-w-0 space-y-1">
              <h4 className="text-sm font-semibold leading-snug text-slate-900 sm:text-base">{title}</h4>
              {hint ? <p className="text-xs leading-relaxed text-slate-500">{hint}</p> : null}
            </div>
          </div>
          {milestone ? (
            <div className="mt-3 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-3 text-sm text-slate-800">
              {milestone}
            </div>
          ) : null}
        </div>
        <div className="space-y-4 px-4 py-5 sm:px-5 lg:col-span-8">{children}</div>
      </div>
    </section>
  );
}
