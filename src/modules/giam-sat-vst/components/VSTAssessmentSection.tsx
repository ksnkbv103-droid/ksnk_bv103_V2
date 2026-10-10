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

/** Hàng đánh giá cố định h-14 — khớp ô thời điểm / hành động. */
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
  invertYesStyle?: boolean;
}) {
  const yesActive = value === true;
  const noActive = value === false;
  return (
    <div className="box-border flex h-14 items-center justify-between gap-3 border-b border-slate-100 px-1 last:border-b-0">
      <span className="bv103-type-label min-w-0 flex-1 text-slate-700 !text-slate-700">{label}</span>
      <div className={`${C.segmentGroup} h-11 shrink-0`} role="group" aria-label={ariaLabel}>
        <button
          type="button"
          onClick={onYes}
          className={`inline-flex h-11 min-w-[3.5rem] items-center justify-center border-r border-slate-200 px-3 bv103-type-label font-semibold last:border-r-0 ${
            yesActive
              ? invertYesStyle
                ? "bg-rose-600 text-white"
                : "bg-[var(--primary)] text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Có
        </button>
        <button
          type="button"
          onClick={onNo}
          className={`inline-flex h-11 min-w-[3.5rem] items-center justify-center border-r border-slate-200 px-3 bv103-type-label font-semibold last:border-r-0 ${
            noActive
              ? invertYesStyle
                ? "bg-[var(--primary)] text-white"
                : "bg-rose-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-50"
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
      <div className="rounded border border-slate-200 bg-white">
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
      <div className="rounded border border-slate-200 bg-white">
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
    <div className="box-border flex h-14 items-center justify-center rounded border border-dashed border-slate-200">
      <span className="bv103-type-label text-slate-400 !text-slate-400">Chọn hành động để đánh giá</span>
    </div>
  );
}
