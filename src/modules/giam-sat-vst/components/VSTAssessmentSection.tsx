// src/modules/giam-sat-vst/components/VSTAssessmentSection.tsx
"use client";

import React from "react";
import type { ExtendedOpportunity, VSTOppAssessmentField } from "../hooks/useVSTFormHandlers";
import { bv103LayoutChrome } from "@/lib/bv103-layout-chrome";

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

const C = bv103LayoutChrome;

export default function VSTAssessmentSection({ opp, pIdx, oIdx, updateAssessment }: VSTAssessmentSectionProps) {
  if (opp.hanh_dong && opp.hanh_dong !== "Bỏ sót") {
    return (
      <div className={`space-y-3 p-3 ${C.panelInset}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={C.labelField}>Đúng kỹ thuật?</span>
          <div className={C.segmentGroup} role="group" aria-label="Đúng kỹ thuật">
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", true)}
              className={`${C.segmentBtn} ${opp.dung_ky_thuat === true ? C.segmentBtnYes : C.segmentBtnIdle}`}
            >
              Có
            </button>
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", false)}
              className={`${C.segmentBtn} ${opp.dung_ky_thuat === false ? C.segmentBtnNo : C.segmentBtnIdle}`}
            >
              Không
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={C.labelField}>Đủ thời gian?</span>
          <div className={C.segmentGroup} role="group" aria-label="Đủ thời gian">
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", true)}
              className={`${C.segmentBtn} ${opp.du_thoi_gian === true ? C.segmentBtnYes : C.segmentBtnIdle}`}
            >
              Có
            </button>
            <button
              type="button"
              onClick={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", false)}
              className={`${C.segmentBtn} ${opp.du_thoi_gian === false ? C.segmentBtnNo : C.segmentBtnIdle}`}
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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-shell)] border border-rose-200 bg-rose-50/50 p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-800">Lạm dụng găng?</span>
        <div className={C.segmentGroup} role="group" aria-label="Lạm dụng găng">
          <button
            type="button"
            onClick={() => updateAssessment(pIdx, oIdx, "co_deo_gang", true)}
            className={`${C.segmentBtn} ${opp.co_deo_gang === true ? C.segmentBtnNo : C.segmentBtnIdle}`}
          >
            Có
          </button>
          <button
            type="button"
            onClick={() => updateAssessment(pIdx, oIdx, "co_deo_gang", false)}
            className={`${C.segmentBtn} ${opp.co_deo_gang === false ? C.segmentBtnYes : C.segmentBtnIdle}`}
          >
            Không
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-14 items-center justify-center rounded-[var(--radius-shell)] border-2 border-dashed border-slate-200 text-[11px] font-medium italic text-slate-400 sm:h-16">
      Hoàn thành bước 2
    </div>
  );
}
