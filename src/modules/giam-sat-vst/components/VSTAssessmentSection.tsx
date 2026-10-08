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

function YesNoRow({
  label,
  ariaLabel,
  value,
  onYes,
  onNo,
  invertYesStyle = false,
}: {
  label: string;
  ariaLabel: string;
  value: boolean | null | undefined;
  onYes: () => void;
  onNo: () => void;
  /** Bỏ sót + mang găng: «Có» = xấu → đỏ. */
  invertYesStyle?: boolean;
}) {
  const yesActive = value === true;
  const noActive = value === false;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="bv103-type-label text-slate-700 !text-slate-700">{label}</span>
      <div className={C.segmentGroup} role="group" aria-label={ariaLabel}>
        <button
          type="button"
          onClick={onYes}
          className={`${C.segmentBtn} ${
            yesActive ? (invertYesStyle ? C.segmentBtnNo : C.segmentBtnYes) : C.segmentBtnIdle
          }`}
        >
          Có
        </button>
        <button
          type="button"
          onClick={onNo}
          className={`${C.segmentBtn} ${
            noActive ? (invertYesStyle ? C.segmentBtnYes : C.segmentBtnNo) : C.segmentBtnIdle
          }`}
        >
          Không
        </button>
      </div>
    </div>
  );
}

export default function VSTAssessmentSection({ opp, pIdx, oIdx, updateAssessment }: VSTAssessmentSectionProps) {
  if (opp.hanh_dong && opp.hanh_dong !== "Bỏ sót") {
    return (
      <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50/60 p-3">
        <YesNoRow
          label="Kỹ thuật quan sát nhanh (phiếu WHO)"
          ariaLabel="Kỹ thuật quan sát nhanh phiếu WHO"
          value={opp.dung_ky_thuat}
          onYes={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", true)}
          onNo={() => updateAssessment(pIdx, oIdx, "dung_ky_thuat", false)}
        />
        <YesNoRow
          label="Đủ thời gian (phiếu WHO)"
          ariaLabel="Đủ thời gian phiếu WHO"
          value={opp.du_thoi_gian}
          onYes={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", true)}
          onNo={() => updateAssessment(pIdx, oIdx, "du_thoi_gian", false)}
        />
      </div>
    );
  }

  if (opp.hanh_dong === "Bỏ sót") {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
        <YesNoRow
          label="Đang mang găng (khi bỏ sót)?"
          ariaLabel="Đang mang găng khi bỏ sót"
          value={opp.co_deo_gang}
          invertYesStyle
          onYes={() => updateAssessment(pIdx, oIdx, "co_deo_gang", true)}
          onNo={() => updateAssessment(pIdx, oIdx, "co_deo_gang", false)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-12 items-center justify-center rounded-md border border-dashed border-slate-200">
      <span className="bv103-type-label text-slate-400 !text-slate-400">Chọn hành động để đánh giá</span>
    </div>
  );
}
