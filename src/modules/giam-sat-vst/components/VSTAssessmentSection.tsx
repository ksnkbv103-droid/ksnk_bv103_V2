// src/modules/giam-sat-vst/components/VSTAssessmentSection.tsx
"use client";

import React from "react";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";

interface VSTAssessmentSectionProps {
  opp: ExtendedOpportunity;
  pIdx: number;
  oIdx: number;
  updateAssessment: (
    pIdx: number,
    oIdx: number,
    field: VSTOppAssessmentField,
    value: boolean | string | null | undefined,
  ) => void;
}

const segBase =
  "min-w-[4rem] px-4 py-2.5 text-xs sm:min-w-[3.25rem] sm:px-3 sm:py-2 sm:text-[10px] font-bold sm:font-semibold uppercase tracking-wide transition-colors first:rounded-l-lg last:rounded-r-lg border-y border-r last:border-r-0 border-slate-200 first:border-l";
const segInactive = "bg-white text-slate-500 hover:bg-slate-50";
const segYes = "bg-[var(--primary)] text-white border-[var(--primary)]";
const segNo = "bg-rose-600 text-white border-rose-600";

export default function VSTAssessmentSection({ opp, pIdx, oIdx, updateAssessment }: VSTAssessmentSectionProps) {
  if (opp.hanh_dong && opp.hanh_dong !== "Bỏ sót") {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-3 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 sm:text-[10px] sm:font-medium sm:text-slate-600">Đúng kỹ thuật?</span>
          <div className="inline-flex overflow-hidden rounded-lg shadow-sm" role="group" aria-label="Đúng kỹ thuật">
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", true)}
              className={`${segBase} ${opp.dung_ky_thuat === true ? segYes : segInactive}`}
            >
              Có
            </button>
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", false)}
              className={`${segBase} ${opp.dung_ky_thuat === false ? segNo : segInactive}`}
            >
              Không
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 sm:text-[10px] sm:font-medium sm:text-slate-600">Đủ thời gian?</span>
          <div className="inline-flex overflow-hidden rounded-lg shadow-sm" role="group" aria-label="Đủ thời gian">
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", true)}
              className={`${segBase} ${opp.du_thoi_gian === true ? segYes : segInactive}`}
            >
              Có
            </button>
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", false)}
              className={`${segBase} ${opp.du_thoi_gian === false ? segNo : segInactive}`}
            >
              Không
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (opp.hanh_dong === "Bỏ sót") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 sm:p-3 animate-in zoom-in-95">
        <span className="text-xs font-black uppercase tracking-wider text-rose-800 sm:text-[10px] sm:font-semibold sm:tracking-wide">Lạm dụng găng?</span>
        <div className="inline-flex overflow-hidden rounded-lg shadow-sm" role="group">
          <button
            type="button"
            onClick={() => updateAssessment(pIdx, oIdx, "co_deo_gang", true)}
            className={`${segBase} ${opp.co_deo_gang === true ? segNo : segInactive}`}
          >
            Có
          </button>
          <button
            type="button"
            onClick={() => updateAssessment(pIdx, oIdx, "co_deo_gang", false)}
            className={`${segBase} ${opp.co_deo_gang === false ? segYes : segInactive}`}
          >
            Không
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-14 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl italic text-xs font-semibold text-slate-400 sm:text-[9px] sm:font-normal sm:text-slate-300 sm:h-16">Hoàn thành bước 2</div>
  );
}
