"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp, ShieldAlert, Award } from "lucide-react";
import type { StructuredClinicalDeduction } from "../lib/nkbv-clinical-rationale";

type Props = {
  deduction: StructuredClinicalDeduction;
  className?: string;
};

export default function NkbvClinicalRationaleCard({ deduction, className = "" }: Props) {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  });

  const toggleStep = (step: number) => {
    setExpandedSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  };

  const badgeColor = {
    HAI_CONFIRMED: "bg-emerald-100 text-emerald-900 border-emerald-300",
    POA_EXCLUDED: "bg-amber-100 text-amber-900 border-amber-300",
    CONTAMINATION: "bg-slate-100 text-slate-800 border-slate-300",
    RULED_OUT: "bg-rose-100 text-rose-900 border-rose-300",
    INSUFFICIENT: "bg-blue-50 text-blue-900 border-blue-200",
  }[deduction.statusBadge];

  const iconByVerdict = (verdict: string) => {
    switch (verdict) {
      case "MET":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
      case "EXCLUDED":
        return <XCircle className="h-4 w-4 text-amber-600 shrink-0" />;
      case "NOT_MET":
        return <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div
      className={`rounded-[var(--radius-shell)] border border-slate-200 bg-white p-4 shadow-xs ${className}`}
    >
      {/* HEADER BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-indigo-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Biện Luận Lâm Sàng & Cơ Sở Xác Định Ca (CDC / NHSN)
          </h4>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold shadow-xs ${badgeColor}`}
        >
          {deduction.isPositive ? "✓ " : "✕ "}
          {deduction.statusLabel}
        </span>
      </div>

      {/* EXECUTIVE SUMMARY */}
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 border border-slate-100">
        <strong className="text-slate-900">Tóm tắt kết luận: </strong>
        {deduction.executiveSummary}
      </div>

      {/* 5 STANDARDIZED DEDUCTIVE STEPS */}
      <div className="mt-3 space-y-2">
        {deduction.steps.map((s) => {
          const isOpen = Boolean(expandedSteps[s.step]);
          return (
            <div
              key={s.step}
              className="rounded-lg border border-slate-100 bg-white overflow-hidden transition-all shadow-2xs"
            >
              <button
                type="button"
                onClick={() => toggleStep(s.step)}
                className="flex w-full items-center justify-between bg-slate-50/70 px-3 py-2 text-left hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {iconByVerdict(s.verdict)}
                  <span className="font-bold text-xs text-slate-800">
                    Bước {s.step}: {s.title}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                    — {s.summary}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
                  <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                    {s.citation}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </div>
              </button>

              {isOpen ? (
                <div className="px-3 py-2 text-xs text-slate-600 space-y-1.5 bg-white border-t border-slate-50">
                  <p className="font-semibold text-slate-800">{s.summary}</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11.5px] text-slate-600">
                    {s.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* IPC RECOMMENDATIONS */}
      {deduction.ipcRecommendations.length > 0 ? (
        <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50/40 p-3 text-xs text-indigo-950">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
            <ShieldAlert className="h-4 w-4 text-indigo-700" />
            <span>Khuyến nghị can thiệp Kiểm soát Nhiễm khuẩn (KSNK.QT.33):</span>
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-indigo-900/90">
            {deduction.ipcRecommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
